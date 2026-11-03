import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { loadConfig, withGuild } from "@/lib/discord/store";
import { sendEmergency, type MailResult } from "@/lib/mail/resend";

const hits = new Map<string, number[]>();

function allowHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export type MatchStatus = "open" | "live" | "done";
export type TicketCategory = "bug" | "report" | "emergency";

export type MatchRow = {
  id: number;
  team1: string;
  team2: string;
  roundLabel: string;
  groupLabel: string;
  startsAt: string | null;
  roomName: string;
  judgeName: string;
  recorderName: string;
  status: MatchStatus;
  remarks: string;
  scoreText: string;
  winner: string;
};

export type TicketRow = {
  id: number;
  category: TicketCategory;
  handle: string;
  body: string;
  status: "open" | "closed";
  createdAt: string;
};

export type SettingsRow = {
  tourName: string;
  seasonLabel: string;
  venueNote: string;
};

export type Board = {
  settings: SettingsRow;
  matches: MatchRow[];
  tickets: TicketRow[];
};

type MatchDb = {
  id: number;
  team1: string;
  team2: string;
  round_label: string;
  group_label: string;
  starts_at: string | Date | null;
  room_name: string;
  judge_name: string;
  recorder_name: string;
  status: string;
  remarks: string;
  score_text: string;
  winner: string;
};

type TicketDb = {
  id: number;
  category: string;
  handle: string;
  body: string;
  status: string;
  created_at: string | Date;
};

function asIso(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asStatus(value: string): MatchStatus {
  if (value === "live" || value === "done" || value === "open") return value;
  return "open";
}

function asCategory(value: string): TicketCategory {
  if (value === "bug" || value === "report" || value === "emergency") return value;
  return "bug";
}

function mapMatch(row: MatchDb): MatchRow {
  return {
    id: Number(row.id),
    team1: row.team1,
    team2: row.team2,
    roundLabel: row.round_label,
    groupLabel: row.group_label,
    startsAt: asIso(row.starts_at),
    roomName: row.room_name,
    judgeName: row.judge_name,
    recorderName: row.recorder_name,
    status: asStatus(row.status),
    remarks: row.remarks,
    scoreText: row.score_text,
    winner: row.winner,
  };
}

function mapTicket(row: TicketDb): TicketRow {
  return {
    id: Number(row.id),
    category: asCategory(row.category),
    handle: row.handle,
    body: row.body,
    status: row.status === "closed" ? "closed" : "open",
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
  };
}

const handleSchema = z
  .string()
  .trim()
  .min(1, "호출명을 입력하세요.")
  .max(24, "호출명은 24자까지입니다.")
  .refine((value) => !value.includes("@") && !/\d{8,}/.test(value), "계정 번호나 연락처는 적지 마세요.");

const noteSchema = z
  .string()
  .trim()
  .max(200)
  .refine((value) => !value.includes("@") && !/\d{8,}/.test(value), "계정 번호나 연락처는 적지 마세요.");

const teamSchema = z.string().trim().min(1, "팀 이름이 필요합니다.").max(32);

const matchFields = z.object({
  team1: teamSchema,
  team2: teamSchema,
  roundLabel: z.string().trim().max(24),
  groupLabel: z.string().trim().max(24),
  startsAt: z.string().trim().max(32),
  roomName: z.string().trim().max(32),
  judgeName: z.string().trim().max(24),
  recorderName: z.string().trim().max(24),
  status: z.enum(["open", "live", "done"]),
  remarks: noteSchema,
  scoreText: z.string().trim().max(16),
  winner: z.string().trim().max(32),
});

function assertPublicText(value: string) {
  if (value.includes("@") || /\d{8,}/.test(value)) {
    throw new Error("계정 번호나 연락처는 적지 마세요.");
  }
}

function assertMatch(data: z.infer<typeof matchFields>) {
  if (data.team1 === data.team2) throw new Error("같은 팀끼리는 맞붙일 수 없습니다.");
  assertPublicText(data.team1);
  assertPublicText(data.team2);
  assertPublicText(data.judgeName);
  assertPublicText(data.recorderName);
  assertPublicText(data.roomName);
  if (data.winner && data.winner !== data.team1 && data.winner !== data.team2) {
    throw new Error("승자는 두 팀 중 하나여야 합니다.");
  }
  if (data.startsAt && Number.isNaN(new Date(data.startsAt).getTime())) {
    throw new Error("시간을 다시 확인하세요.");
  }
}

export const getBoard = createServerFn({ method: "GET" }).handler(async (): Promise<Board> => {
  const { assertAdmin } = await import("@/lib/admin/session.server");
  await assertAdmin();
  const sql = await getSql();
  await sql`
    insert into desk_settings (id, tour_name, season_label, venue_note)
    values (1, 'Raven Tournament', '시즌 01', '일정은 한국 시간')
    on conflict (id) do nothing
  `;
  const settingsRows = await sql<{ tour_name: string; season_label: string; venue_note: string }>`
    select tour_name, season_label, venue_note from desk_settings where id = 1
  `;
  const matchRows = await sql<MatchDb>`
    select id, team1, team2, round_label, group_label, starts_at, room_name,
           judge_name, recorder_name, status, remarks, score_text, winner
    from matches
    order by starts_at nulls last, id asc
  `;
  const ticketRows = await sql<TicketDb>`
    select id, category, handle, body, status, created_at
    from tickets
    order by created_at desc
    limit 40
  `;
  const settings = settingsRows[0];
  return {
    settings: {
      tourName: settings?.tour_name ?? "Raven Tournament",
      seasonLabel: settings?.season_label ?? "시즌 01",
      venueNote: settings?.venue_note ?? "",
    },
    matches: matchRows.map(mapMatch),
    tickets: ticketRows.map(mapTicket),
  };
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tourName: z.string().trim().min(1).max(40),
      seasonLabel: z.string().trim().min(1).max(24),
      venueNote: noteSchema,
    }),
  )
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("@/lib/admin/session.server");
    await assertAdmin();
    assertPublicText(data.tourName);
    assertPublicText(data.seasonLabel);
    const sql = await getSql();
    await sql`
      update desk_settings
      set tour_name = ${data.tourName},
          season_label = ${data.seasonLabel},
          venue_note = ${data.venueNote}
      where id = 1
    `;
    return { ok: true };
  });

export const createMatch = createServerFn({ method: "POST" })
  .validator(matchFields)
  .handler(async () => {
    throw new Error("일정과 배정은 디스코드 슬래시에서만 바뀝니다.");
  });

export const updateMatch = createServerFn({ method: "POST" })
  .validator(matchFields.extend({ id: z.number().int().positive() }))
  .handler(async () => {
    throw new Error("일정과 배정은 디스코드 슬래시에서만 바뀝니다.");
  });

export const removeMatch = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async () => {
    throw new Error("일정과 배정은 디스코드 슬래시에서만 바뀝니다.");
  });

export const claimStaff = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().positive(),
      role: z.enum(["judge", "recorder"]),
      handle: handleSchema,
    }),
  )
  .handler(async () => {
    throw new Error("심판·기록 배정은 디스코드 /events 에서만 바뀝니다.");
  });

export const clearStaff = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().positive(),
      role: z.enum(["judge", "recorder"]),
    }),
  )
  .handler(async () => {
    throw new Error("심판·기록 배정은 디스코드 /events 에서만 바뀝니다.");
  });

export const createTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      category: z.enum(["bug", "report", "emergency"]),
      handle: handleSchema,
      body: z
        .string()
        .trim()
        .min(4, "상황을 한 줄은 적어 주세요.")
        .max(280)
        .refine((value) => !value.includes("@") && !/\d{8,}/.test(value), "계정 번호나 연락처는 적지 마세요."),
      slug: z.string().trim().max(32).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: true; mail: MailResult | "none" }> => {
    const request = getRequest();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!allowHit(`ticket:${ip}`, data.category === "emergency" ? 3 : 5, 10 * 60 * 1000)) {
      throw new Error("잠시 뒤에 다시 보내 주세요.");
    }
    const sql = await getSql();
    if (data.category !== "emergency") {
      await sql`
        insert into tickets (category, handle, body, guild_id)
        values (${data.category}, ${data.handle}, ${data.body}, 'site')
      `;
      return { ok: true, mail: "none" };
    }
    const slug = data.slug?.trim().toLowerCase() ?? "";
    if (!slug) throw new Error("비상은 서버를 골라야 합니다.");
    const guilds = await sql<{ guild_id: string; name: string }>`
      select guild_id, name from guilds where slug = ${slug}
    `;
    const guild = guilds[0];
    if (!guild) throw new Error("없는 서버입니다.");
    await sql`
      insert into tickets (category, handle, body, guild_id)
      values (${data.category}, ${data.handle}, ${data.body}, ${guild.guild_id})
    `;
    const mail = await withGuild(guild.guild_id, async () => {
      const config = await loadConfig();
      return sendEmergency({
        to: [config.alert_email_1, config.alert_email_2, config.alert_email_3],
        serverName: guild.name || slug,
        source: "웹 문의",
        handle: data.handle,
        body: data.body,
      });
    });
    return { ok: true, mail };
  });
