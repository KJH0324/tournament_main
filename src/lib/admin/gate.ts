import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readAdminSession } = await import("./session.server");
  return readAdminSession();
});

export const prepareAdminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().trim().min(1, "아이디를 입력하세요.").max(64) }))
  .handler(async ({ data }) => {
    const { prepareAdminLogin: prepare } = await import("./session.server");
    return prepare(data.id);
  });

export const loginAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().trim().min(1, "아이디를 입력하세요.").max(64),
      code: z.string().trim().min(6, "인증코드 6자리를 입력하세요.").max(8),
    }),
  )
  .handler(async ({ data }) => {
    const { loginAdminSession } = await import("./session.server");
    await loginAdminSession(data.id, data.code);
    return { ok: true as const };
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutAdminSession } = await import("./session.server");
  await logoutAdminSession();
  return { ok: true as const };
});

const accountId = z.string().trim().min(1).max(32);

export const listAdminAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const { listAdminIds } = await import("./session.server");
  return { accounts: await listAdminIds() };
});

export const addAdminAccount = createServerFn({ method: "POST" })
  .validator(z.object({ id: accountId }))
  .handler(async ({ data }) => {
    const { addAdminAccount: add } = await import("./session.server");
    return add(data.id);
  });

export const removeAdminAccount = createServerFn({ method: "POST" })
  .validator(z.object({ id: accountId }))
  .handler(async ({ data }) => {
    const { removeAdminAccount: remove } = await import("./session.server");
    await remove(data.id);
    return { ok: true as const };
  });
