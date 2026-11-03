import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { alertRecipients, normalizeAlertEmail } from "@/lib/mail/resend";
import { listAudit, listEvents, loadConfig, patchConfig, withGuild, type EventRow } from "@/lib/discord/store";

const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/);

export type ServerCard = {
  slug: string;
  name: string;
  openMatches: number;
  doneMatches: number;
  ready: boolean;
};

export type PublicMatch = {
  id: number;
  team1: string;
  team2: string;
  roundLabel: string;
  groupLabel: string;
  startsAt: string | null;
  roomName: string;
  status: string;
  state: string;
  scoreText: string;
  winner: string;
  judgeName: string;
  recorderName: string;
};

function iso(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toMatch(row: EventRow): PublicMatch {
  return {
    id: Number(row.id),
    team1: row.team1,
    team2: row.team2,
    roundLabel: row.round_label,
    groupLabel: row.group_label,
    startsAt: iso(row.starts_at),
    roomName: row.room_name,
    status: row.status,
    state: row.state,
    scoreText: row.score_text,
    winner: row.winner,
    judgeName: row.judge_name,
    recorderName: row.recorder_name,
  };
}

export function adminHost(host: string): boolean {
  const name = host.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  return name.startsWith("admin.");
}

export const getSurface = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const host = request?.headers.get("x-forwarded-host") || request?.headers.get("host") || "";
  return { admin: adminHost(host) };
});

export const listServers = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    slug: string;
    name: string;
    open_matches: number;
    done_matches: number;
    ready: boolean;
  }>`
    select g.slug, g.name,
      (select count(*) from matches m where m.guild_id = g.guild_id and m.status <> 'done') as open_matches,
      (select count(*) from matches m where m.guild_id = g.guild_id and m.status = 'done') as done_matches,
      (
        c.admin_role <> '' and c.organizer_role <> '' and c.supervisor_role <> ''
        and c.operator_role <> '' and c.commander_role <> ''
      ) as ready
    from guilds g
    left join guild_config c on c.guild_id = g.guild_id
    order by g.created_at asc
  `;
  const servers: ServerCard[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name || row.slug,
    openMatches: Number(row.open_matches ?? 0),
    doneMatches: Number(row.done_matches ?? 0),
    ready: Boolean(row.ready),
  }));
  return { servers };
});

async function guildBySlug(slug: string) {
  const sql = await getSql();
  const rows = await sql<{ guild_id: string; slug: string; name: string }>`
    select guild_id, slug, name from guilds where slug = ${slug}
  `;
  return rows[0] ?? null;
}

export const getServerBoard = createServerFn({ method: "GET" })
  .validator(z.object({ slug: slugSchema }))
  .handler(async ({ data }) => {
    const guild = await guildBySlug(data.slug);
    if (!guild) throw new Error("없는 서버입니다.");
    return withGuild(guild.guild_id, async () => {
      const events = (await listEvents()).map(toMatch);
      return {
        slug: guild.slug,
        name: guild.name || guild.slug,
        matches: events,
      };
    });
  });

export const getAdminBoard = createServerFn({ method: "GET" })
  .validator(z.object({ slug: slugSchema }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("@/lib/admin/session.server");
    await assertAdmin();
    const guild = await guildBySlug(data.slug);
    if (!guild) throw new Error("없는 서버입니다.");
    return withGuild(guild.guild_id, async () => {
      const config = await loadConfig();
      const events = (await listEvents()).map(toMatch);
      const audit = await listAudit(12);
      const sql = await getSql();
      const tickets = await sql<{ n: number }>`
        select count(*) as n from tickets where guild_id = ${guild.guild_id} and status = 'open'
      `;
      return {
        slug: guild.slug,
        name: guild.name || guild.slug,
        guildId: guild.guild_id,
        matches: events,
        openTickets: Number(tickets[0]?.n ?? 0),
        roles: {
          admin: Boolean(config.admin_role),
          organizer: Boolean(config.organizer_role),
          supervisor: Boolean(config.supervisor_role),
          operator: Boolean(config.operator_role),
          commander: Boolean(config.commander_role),
        },
        challonge: Boolean(config.challonge_tournament),
        alertCount: alertRecipients([config.alert_email_1, config.alert_email_2, config.alert_email_3]).length,
        emails: [config.alert_email_1, config.alert_email_2, config.alert_email_3] as [string, string, string],
        audit: audit.map((row) => ({
          action: row.action,
          at: iso(row.created_at) ?? "",
        })),
      };
    });
  });

export const saveAlertEmails = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slug: slugSchema,
      email1: z.string().max(120),
      email2: z.string().max(120),
      email3: z.string().max(120),
    }),
  )
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("@/lib/admin/session.server");
    await assertAdmin();
    const guild = await guildBySlug(data.slug);
    if (!guild) throw new Error("없는 서버입니다.");
    const slots = [data.email1, data.email2, data.email3].map((value) => {
      const trimmed = value.trim();
      if (!trimmed) return "";
      const parsed = normalizeAlertEmail(trimmed);
      if (!parsed) throw new Error("메일 주소가 아닙니다.");
      return parsed;
    });
    if (new Set(slots.filter(Boolean)).size !== slots.filter(Boolean).length) {
      throw new Error("같은 주소가 두 칸에 있습니다.");
    }
    await withGuild(guild.guild_id, () =>
      patchConfig({
        alert_email_1: slots[0],
        alert_email_2: slots[1],
        alert_email_3: slots[2],
      }),
    );
    return { ok: true as const, count: alertRecipients(slots).length };
  });

export const listResults = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    team1: string;
    team2: string;
    round_label: string;
    starts_at: string | Date | null;
    score_text: string;
    winner: string;
    guild_name: string;
    slug: string;
  }>`
    select m.id, m.team1, m.team2, m.round_label, m.starts_at, m.score_text, m.winner,
           g.name as guild_name, g.slug
    from matches m
    join guilds g on g.guild_id = m.guild_id
    where m.state in ('verified', 'archived')
    order by m.starts_at desc nulls last, m.id desc
    limit 80
  `;
  return {
    results: rows.map((row) => ({
      id: Number(row.id),
      team1: row.team1,
      team2: row.team2,
      roundLabel: row.round_label,
      startsAt: iso(row.starts_at),
      scoreText: row.score_text,
      winner: row.winner,
      server: row.guild_name || row.slug,
      slug: row.slug,
    })),
  };
});
