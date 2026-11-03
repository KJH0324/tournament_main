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
      const audit = await listAudit(40);
      const sql = await getSql();
      const gid = guild.guild_id;
      const tickets = await sql<{ n: number }>`
        select count(*) as n from tickets where guild_id = ${gid} and status = 'open'
      `;
      const counts = await sql<{ teams: number; roster: number; bans: number; appeals: number }>`
        select
          (select count(distinct team_name) from rosters where guild_id = ${gid}) as teams,
          (select count(*) from rosters where guild_id = ${gid}) as roster,
          (select count(*) from bans where guild_id = ${gid}) as bans,
          (select count(*) from appeals where guild_id = ${gid} and status <> 'closed') as appeals
      `;
      const roster = await sql<{ team_name: string; game_id: string; role: string; discord_id: string }>`
        select team_name, game_id, role, discord_id
        from rosters
        where guild_id = ${gid}
        order by team_name, role desc, game_id
        limit 400
      `;
      const bans = await sql<{ game_id: string; reason: string; banned_by: string; banned_at: string | Date }>`
        select game_id, reason, banned_by, banned_at
        from bans
        where guild_id = ${gid}
        order by banned_at desc
        limit 80
      `;
      const appeals = await sql<{
        id: string;
        match_ref: string;
        team_name: string;
        reason: string;
        status: string;
        decision: string;
        created_at: string | Date;
      }>`
        select id, match_ref, team_name, reason, status, decision, created_at
        from appeals
        where guild_id = ${gid}
        order by created_at desc
        limit 40
      `;
      const snapshots = await sql<{ id: string; label: string; created_at: string | Date }>`
        select id, label, created_at from snapshots where guild_id = ${gid} order by created_at desc limit 8
      `;
      const count = counts[0];
      return {
        slug: guild.slug,
        name: guild.name || guild.slug,
        guildId: gid,
        matches: events,
        openTickets: Number(tickets[0]?.n ?? 0),
        teams: Number(count?.teams ?? 0),
        rosterCount: Number(count?.roster ?? 0),
        banCount: Number(count?.bans ?? 0),
        appealCount: Number(count?.appeals ?? 0),
        roles: {
          admin: Boolean(config.admin_role),
          organizer: Boolean(config.organizer_role),
          supervisor: Boolean(config.supervisor_role),
          operator: Boolean(config.operator_role),
          commander: Boolean(config.commander_role),
        },
        channels: {
          appeal: config.appeal_channel,
          participants: config.participants_channel,
          schedule: config.schedule_channel,
          results: config.results_channel,
          notification: config.notification_channel,
          transcript: config.transcript_channel,
          thumbnail: config.thumbnail_channel,
        },
        challongeUrl: config.challonge_tournament,
        challonge: Boolean(config.challonge_tournament),
        alertCount: alertRecipients([config.alert_email_1, config.alert_email_2, config.alert_email_3]).length,
        emails: [config.alert_email_1, config.alert_email_2, config.alert_email_3] as [string, string, string],
        roster: roster.map((row) => ({
          team: row.team_name,
          gameId: row.game_id,
          role: row.role,
          discordId: row.discord_id,
        })),
        bans: bans.map((row) => ({
          gameId: row.game_id,
          reason: row.reason,
          by: row.banned_by,
          at: iso(row.banned_at) ?? "",
        })),
        appeals: appeals.map((row) => ({
          id: row.id,
          match: row.match_ref,
          team: row.team_name,
          reason: row.reason,
          status: row.status,
          decision: row.decision,
          at: iso(row.created_at) ?? "",
        })),
        snapshots: snapshots.map((row) => ({
          id: row.id,
          label: row.label,
          at: iso(row.created_at) ?? "",
        })),
        audit: audit.map((row) => ({
          action: row.action,
          actor: row.actor_id,
          detail: row.detail,
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
