import { createHash } from "node:crypto";
import { getRequestIP, useSession } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { qrSvg } from "./qr.server";
import { generateBase32Secret, normalizeAdminId, otpauthUri, safeEqual, verifyTotp } from "./totp";

type AdminSession = { admin?: boolean; id?: string; main?: boolean };

const fails = new Map<string, { n: number; until: number }>();

async function confirmedMainSecret(): Promise<string | null> {
  const envSecret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (envSecret) return envSecret;
  const id = process.env.ADMIN_ID?.trim();
  if (!id) return null;
  const sql = await getSql();
  const rows = await sql<{ secret: string }>`
    select secret from admin_totp where id = ${id} and confirmed = true
  `;
  return rows[0]?.secret ?? null;
}

async function sessionPassword(): Promise<string | null> {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;
  const id = process.env.ADMIN_ID?.trim();
  const secret = await confirmedMainSecret();
  if (!id || !secret) return null;
  return createHash("sha256").update(`raven-admin:${id}:${secret}`).digest("hex");
}

function sessionOptions(password: string) {
  return {
    name: "raven_admin",
    password,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 12,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

function clientIp(): string {
  return getRequestIP() || "local";
}

function locked(ip: string): boolean {
  const row = fails.get(ip);
  return Boolean(row && row.n >= 8 && row.until > Date.now());
}

function mark(ip: string, ok: boolean) {
  if (ok) {
    fails.delete(ip);
    return;
  }
  const row = fails.get(ip) ?? { n: 0, until: 0 };
  row.n += 1;
  if (row.n >= 8) row.until = Date.now() + 10 * 60 * 1000;
  fails.set(ip, row);
}

export async function readAdminSession(): Promise<{ authed: boolean; main: boolean; id: string }> {
  const password = await sessionPassword();
  if (!password) return { authed: false, main: false, id: "" };
  const session = await useSession<AdminSession>(sessionOptions(password));
  if (session.data.admin !== true) return { authed: false, main: false, id: "" };
  const id = session.data.id ?? "";
  const main = session.data.main === true || id === "";
  if (!main) {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`select id from admin_accounts where lower(id) = lower(${id})`;
    if (!rows[0]) return { authed: false, main: false, id: "" };
  }
  return { authed: true, main, id: id || process.env.ADMIN_ID?.trim() || "" };
}

export async function adminAuthed(): Promise<boolean> {
  return (await readAdminSession()).authed;
}

export async function assertAdmin(): Promise<void> {
  if (!(await adminAuthed())) throw new Error("관리 로그인이 필요합니다.");
}

async function assertMain(): Promise<void> {
  const session = await readAdminSession();
  if (!session.authed) throw new Error("관리 로그인이 필요합니다.");
  if (!session.main) throw new Error("메인 관리자만 바꿀 수 있습니다.");
}

async function accountById(id: string): Promise<{ id: string; secret: string } | null> {
  const sql = await getSql();
  const rows = await sql<{ id: string; secret: string }>`
    select id, secret from admin_accounts where lower(id) = lower(${id.trim()})
  `;
  return rows[0] ?? null;
}

export async function prepareAdminLogin(id: string): Promise<{ mode: "code" } | { mode: "qr"; svg: string }> {
  const ip = clientIp();
  if (locked(ip)) throw new Error("잠시 후 다시 시도하세요.");
  const main = process.env.ADMIN_ID?.trim() ?? "";
  if (!main) throw new Error("서버에 관리자 아이디가 없습니다.");
  if (safeEqual(id.trim(), main)) {
    if (await confirmedMainSecret()) return { mode: "code" };
    const sql = await getSql();
    const existing = await sql<{ secret: string }>`select secret from admin_totp where id = ${main}`;
    let secret = existing[0]?.secret ?? "";
    if (!secret) {
      secret = generateBase32Secret();
      await sql`insert into admin_totp (id, secret, confirmed) values (${main}, ${secret}, false)`;
    }
    return { mode: "qr", svg: await qrSvg(otpauthUri(main, secret)) };
  }
  const account = await accountById(id);
  if (account) return { mode: "code" };
  mark(ip, false);
  throw new Error("아이디가 맞지 않습니다.");
}

async function confirmPending(id: string): Promise<void> {
  if (process.env.ADMIN_TOTP_SECRET?.trim()) return;
  const sql = await getSql();
  await sql`update admin_totp set confirmed = true where id = ${id}`;
}

async function mainLoginSecret(): Promise<string | null> {
  const envSecret = process.env.ADMIN_TOTP_SECRET?.trim();
  if (envSecret) return envSecret;
  const id = process.env.ADMIN_ID?.trim();
  if (!id) return null;
  const sql = await getSql();
  const rows = await sql<{ secret: string }>`select secret from admin_totp where id = ${id}`;
  return rows[0]?.secret ?? null;
}

export async function loginAdminSession(id: string, code: string): Promise<void> {
  const ip = clientIp();
  if (locked(ip)) throw new Error("잠시 후 다시 시도하세요.");
  const main = process.env.ADMIN_ID?.trim() ?? "";
  if (!main) throw new Error("서버에 관리자 아이디가 없습니다.");
  let matched: { id: string; main: boolean } | null = null;
  if (safeEqual(id.trim(), main)) {
    const secret = await mainLoginSecret();
    if (!secret) throw new Error("인증 앱을 먼저 등록하세요.");
    if (!verifyTotp(secret, code)) {
      mark(ip, false);
      throw new Error("아이디 또는 인증코드가 맞지 않습니다.");
    }
    await confirmPending(main);
    matched = { id: main, main: true };
  } else {
    const account = await accountById(id);
    if (account && verifyTotp(account.secret, code)) matched = { id: account.id, main: false };
  }
  if (!matched) {
    mark(ip, false);
    throw new Error("아이디 또는 인증코드가 맞지 않습니다.");
  }
  const password = await sessionPassword();
  if (!password) throw new Error("서버에 관리자 아이디가 없습니다.");
  const session = await useSession<AdminSession>(sessionOptions(password));
  await session.update({ admin: true, id: matched.id, main: matched.main });
  mark(ip, true);
}

export async function logoutAdminSession(): Promise<void> {
  const password = await sessionPassword();
  if (!password) return;
  const session = await useSession<AdminSession>(sessionOptions(password));
  await session.clear();
}

export async function listAdminIds(): Promise<{ id: string }[]> {
  await assertMain();
  const sql = await getSql();
  const rows = await sql<{ id: string }>`select id from admin_accounts order by created_at, id`;
  return rows.map((row) => ({ id: row.id }));
}

export async function addAdminAccount(input: string): Promise<{ id: string; secret: string; uri: string }> {
  await assertMain();
  const id = normalizeAdminId(input);
  if (!id) throw new Error("아이디는 2자 이상이어야 하고, 공백은 넣을 수 없습니다.");
  const main = process.env.ADMIN_ID?.trim() ?? "";
  if (main && id.toLowerCase() === main.toLowerCase()) throw new Error("메인 관리자 아이디입니다.");
  const sql = await getSql();
  const existing = await sql<{ n: number }>`select count(*) as n from admin_accounts`;
  if (Number(existing[0]?.n ?? 0) >= 20) throw new Error("관리자는 20명까지입니다.");
  const taken = await accountById(id);
  if (taken) throw new Error("이미 있는 아이디입니다.");
  const secret = generateBase32Secret();
  await sql`insert into admin_accounts (id, secret) values (${id}, ${secret})`;
  return { id, secret, uri: otpauthUri(id, secret) };
}

export async function removeAdminAccount(input: string): Promise<void> {
  await assertMain();
  const id = input.trim();
  if (!id) throw new Error("없는 아이디입니다.");
  const sql = await getSql();
  const rows = await sql<{ id: string }>`delete from admin_accounts where lower(id) = lower(${id}) returning id`;
  if (!rows[0]) throw new Error("없는 아이디입니다.");
}
