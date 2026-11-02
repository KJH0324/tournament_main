import { AsyncLocalStorage } from "node:async_hooks";
import { getSql } from "@/lib/db";
import { TOURNAMENT_GUILD_ID, boardStatus } from "./protocol";

const guildSlot = new AsyncLocalStorage<string>();

export function currentGuild(): string {
  return guildSlot.getStore() || TOURNAMENT_GUILD_ID;
}

export function withGuild<T>(guildId: string, run: () => Promise<T>): Promise<T> {
  return guildSlot.run(guildId, run);
}

function gid(): string {
  return currentGuild();
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function slugForGuild(guildId: string): string {
  return `g${guildId.slice(-8)}`;
}

export async function ensureGuild(guildId: string, name?: string): Promise<void> {
  const sql = await getSql();
  const existing = await sql<{ guild_id: string }>`select guild_id from guilds where guild_id = ${guildId}`;
  if (existing[0]) {
    if (name && name.trim()) {
      await sql`update guilds set name = ${name.trim().slice(0, 40)} where guild_id = ${guildId} and name = ''`;
    }
    await sql`insert into guild_config (guild_id) values (${guildId}) on conflict (guild_id) do nothing`;
    return;
  }
  let slug = slugForGuild(guildId);
  const clash = await sql<{ slug: string }>`select slug from guilds where slug = ${slug}`;
  if (clash[0]) slug = `g${guildId.slice(-12)}`;
  const label = (name?.trim() || `서버 ${guildId.slice(-4)}`).slice(0, 40);
  await sql`
    insert into guilds (guild_id, slug, name) values (${guildId}, ${slug}, ${label})
    on conflict (guild_id) do nothing
  `;
  await sql`insert into guild_config (guild_id) values (${guildId}) on conflict (guild_id) do nothing`;
}

export async function guildProfile(): Promise<{ slug: string; name: string }> {
  const sql = await getSql();
  const rows = await sql<{ slug: string; name: string }>`
    select slug, name from guilds where guild_id = ${gid()}
  `;
  return rows[0] ?? { slug: "", name: "" };
}

export async function setGuildSlug(slug: string): Promise<string | null> {
  const next = slug.trim().toLowerCase();
  if (!SLUG_RE.test(next)) return "주소는 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다.";
  const sql = await getSql();
  const taken = await sql<{ guild_id: string }>`
    select guild_id from guilds where slug = ${next} and guild_id <> ${gid()}
  `;
  if (taken[0]) return "이미 다른 서버가 쓰는 주소입니다.";
  await sql`update guilds set slug = ${next} where guild_id = ${gid()}`;
  return null;
}

export async function setGuildName(name: string): Promise<void> {
  const sql = await getSql();
  await sql`update guilds set name = ${name.trim().slice(0, 40)} where guild_id = ${gid()}`;
}

export type BotConfig = {
  admin_role: string;
  organizer_role: string;
  supervisor_role: string;
  operator_role: string;
  commander_role: string;
  strict_authorization: boolean;
  max_active_matches: number;
  max_roster_members_per_team: number;
  max_roster_upload_rows: number;
  match_channel_batch_limit: number;
  appeal_channel: string;
  participants_channel: string;
  schedule_channel: string;
  results_channel: string;
  notification_channel: string;
  transcript_channel: string;
  thumbnail_channel: string;
  tour_logo: string;
  challonge_tournament: string;
  alert_email_1: string;
  alert_email_2: string;
  alert_email_3: string;
};

export type EventRow = {
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
  state: string;
  challonge_match: string;
  commander1: string;
  commander2: string;
  team1_ready: boolean;
  team2_ready: boolean;
  disqualified: string;
  channel_id: string;
  image_url: string;
};

const EVENT_COLUMNS = `id, team1, team2, round_label, group_label, starts_at, room_name,
  judge_name, recorder_name, status, remarks, score_text, winner, state, challonge_match,
  commander1, commander2, team1_ready, team2_ready, disqualified, channel_id, image_url`;

function num(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

export async function loadConfig(): Promise<BotConfig> {
  const sql = await getSql();
  const id = gid();
  await ensureGuild(id);
  const rows = await sql<Record<string, unknown>>`select * from guild_config where guild_id = ${id}`;
  const row = rows[0] ?? {};
  return {
    admin_role: text(row.admin_role),
    organizer_role: text(row.organizer_role),
    supervisor_role: text(row.supervisor_role),
    operator_role: text(row.operator_role),
    commander_role: text(row.commander_role),
    strict_authorization: Boolean(row.strict_authorization),
    max_active_matches: num(row.max_active_matches, 128),
    max_roster_members_per_team: num(row.max_roster_members_per_team, 6),
    max_roster_upload_rows: num(row.max_roster_upload_rows, 2500),
    match_channel_batch_limit: num(row.match_channel_batch_limit, 40),
    appeal_channel: text(row.appeal_channel),
    participants_channel: text(row.participants_channel),
    schedule_channel: text(row.schedule_channel),
    results_channel: text(row.results_channel),
    notification_channel: text(row.notification_channel),
    transcript_channel: text(row.transcript_channel),
    thumbnail_channel: text(row.thumbnail_channel),
    tour_logo: text(row.tour_logo),
    challonge_tournament: text(row.challonge_tournament),
    alert_email_1: text(row.alert_email_1),
    alert_email_2: text(row.alert_email_2),
    alert_email_3: text(row.alert_email_3),
  };
}

export async function patchConfig(patch: Partial<BotConfig>): Promise<void> {
  const current = await loadConfig();
  const next = { ...current, ...patch };
  const sql = await getSql();
  await sql`
    update guild_config set
      admin_role = ${next.admin_role},
      organizer_role = ${next.organizer_role},
      supervisor_role = ${next.supervisor_role},
      operator_role = ${next.operator_role},
      commander_role = ${next.commander_role},
      strict_authorization = ${next.strict_authorization},
      max_active_matches = ${next.max_active_matches},
      max_roster_members_per_team = ${next.max_roster_members_per_team},
      max_roster_upload_rows = ${next.max_roster_upload_rows},
      match_channel_batch_limit = ${next.match_channel_batch_limit},
      appeal_channel = ${next.appeal_channel},
      participants_channel = ${next.participants_channel},
      schedule_channel = ${next.schedule_channel},
      results_channel = ${next.results_channel},
      notification_channel = ${next.notification_channel},
      transcript_channel = ${next.transcript_channel},
      thumbnail_channel = ${next.thumbnail_channel},
      tour_logo = ${next.tour_logo},
      challonge_tournament = ${next.challonge_tournament},
      alert_email_1 = ${next.alert_email_1},
      alert_email_2 = ${next.alert_email_2},
      alert_email_3 = ${next.alert_email_3}
    where guild_id = ${gid()}
  `;
}

export async function audit(action: string, actorId: string, detail: string): Promise<void> {
  const sql = await getSql();
  await sql`insert into audit_log (action, actor_id, detail, guild_id) values (${action}, ${actorId}, ${detail.slice(0, 500)}, ${gid()})`;
}

export async function listAudit(limit: number, action?: string, actorId?: string) {
  const sql = await getSql();
  const cap = Math.min(Math.max(limit, 1), 200);
  const guild = gid();
  if (action && actorId) {
    return sql<{ id: number; action: string; actor_id: string; detail: string; created_at: string }>`
      select id, action, actor_id, detail, created_at from audit_log
      where guild_id = ${guild} and action = ${action} and actor_id = ${actorId}
      order by id desc limit ${cap}
    `;
  }
  if (action) {
    return sql<{ id: number; action: string; actor_id: string; detail: string; created_at: string }>`
      select id, action, actor_id, detail, created_at from audit_log
      where guild_id = ${guild} and action = ${action}
      order by id desc limit ${cap}
    `;
  }
  if (actorId) {
    return sql<{ id: number; action: string; actor_id: string; detail: string; created_at: string }>`
      select id, action, actor_id, detail, created_at from audit_log
      where guild_id = ${guild} and actor_id = ${actorId}
      order by id desc limit ${cap}
    `;
  }
  return sql<{ id: number; action: string; actor_id: string; detail: string; created_at: string }>`
    select id, action, actor_id, detail, created_at from audit_log
    where guild_id = ${guild}
    order by id desc limit ${cap}
  `;
}

export function matchKey(raw: string): string {
  const hit = raw.trim().match(/^(\d+)/);
  return hit ? hit[1] : raw.trim();
}

export async function findEvent(raw: string): Promise<EventRow | null> {
  const key = matchKey(raw);
  if (!key) return null;
  const sql = await getSql();
  const found = await sql.query<EventRow>(
    `select ${EVENT_COLUMNS} from matches
     where guild_id = $2 and (id::text = $1 or challonge_match = $1)
     order by id desc limit 1`,
    [key, gid()],
  );
  return found[0] ?? null;
}

export async function searchEvents(query: string): Promise<EventRow[]> {
  const sql = await getSql();
  const like = `%${query.trim().toLowerCase()}%`;
  return sql.query<EventRow>(
    `select ${EVENT_COLUMNS} from matches
     where guild_id = $2 and (lower(team1) like $1 or lower(team2) like $1 or id::text like $1 or lower(challonge_match) like $1)
     order by starts_at nulls last, id desc
     limit 25`,
    [like, gid()],
  );
}

export async function listEvents(): Promise<EventRow[]> {
  const sql = await getSql();
  return sql.query<EventRow>(
    `select ${EVENT_COLUMNS} from matches where guild_id = $1 order by starts_at nulls last, id asc`,
    [gid()],
  );
}

export async function activeCount(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*) as n from matches
    where guild_id = ${gid()} and state in ('scheduled', 'checkin_open', 'in_progress', 'result_submitted')
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function insertEvent(input: {
  team1: string;
  team2: string;
  roundLabel: string;
  groupLabel: string;
  startsAt: string;
  roomName: string;
  judgeName: string;
  recorderName: string;
  remarks: string;
  challonge: string;
  commander1: string;
  commander2: string;
  channelId: string;
  imageUrl: string;
}): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`
    insert into matches (
      team1, team2, round_label, group_label, starts_at, room_name,
      judge_name, recorder_name, status, remarks, state, challonge_match,
      commander1, commander2, channel_id, image_url, guild_id
    ) values (
      ${input.team1}, ${input.team2}, ${input.roundLabel}, ${input.groupLabel}, ${input.startsAt}, ${input.roomName},
      ${input.judgeName}, ${input.recorderName}, 'open', ${input.remarks}, 'scheduled', ${input.challonge},
      ${input.commander1}, ${input.commander2}, ${input.channelId}, ${input.imageUrl}, ${gid()}
    )
    returning id
  `;
  return Number(rows[0]?.id ?? 0);
}

export async function saveEvent(row: EventRow): Promise<void> {
  const sql = await getSql();
  const status = boardStatus(row.state);
  await sql`
    update matches set
      team1 = ${row.team1},
      team2 = ${row.team2},
      round_label = ${row.round_label},
      group_label = ${row.group_label},
      starts_at = ${row.starts_at instanceof Date ? row.starts_at.toISOString() : row.starts_at},
      room_name = ${row.room_name},
      judge_name = ${row.judge_name},
      recorder_name = ${row.recorder_name},
      status = ${status},
      remarks = ${row.remarks},
      score_text = ${row.score_text},
      winner = ${row.winner},
      state = ${row.state},
      challonge_match = ${row.challonge_match},
      commander1 = ${row.commander1},
      commander2 = ${row.commander2},
      team1_ready = ${row.team1_ready},
      team2_ready = ${row.team2_ready},
      disqualified = ${row.disqualified},
      channel_id = ${row.channel_id},
      image_url = ${row.image_url}
    where id = ${row.id} and guild_id = ${gid()}
  `;
}

export async function deleteEvent(id: number): Promise<void> {
  const sql = await getSql();
  await sql`delete from matches where id = ${id} and guild_id = ${gid()}`;
}

export async function abortActive(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`
    update matches set state = 'aborted', status = 'done'
    where guild_id = ${gid()} and state in ('scheduled', 'checkin_open', 'in_progress', 'result_submitted')
    returning id
  `;
  return rows.length;
}

export function titleOf(row: EventRow): string {
  return `${row.team1} vs ${row.team2}`;
}

export function whenIso(value: string | Date | null): string {
  if (!value) return "unscheduled";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "unscheduled";
  return date.toISOString().replace(".000Z", "Z");
}

export async function replaceRosters(
  rows: { teamName: string; gameId: string; role: string; discordId: string }[],
): Promise<void> {
  const sql = await getSql();
  await sql`delete from rosters where guild_id = ${gid()}`;
  for (const row of rows) {
    await sql`
      insert into rosters (team_name, game_id, role, discord_id, guild_id)
      values (${row.teamName}, ${row.gameId}, ${row.role}, ${row.discordId}, ${gid()})
      on conflict (guild_id, team_name, game_id) do update set role = excluded.role, discord_id = excluded.discord_id
    `;
  }
}

export async function rosterRows(team?: string) {
  const sql = await getSql();
  if (team) {
    return sql<{ team_name: string; game_id: string; role: string; discord_id: string }>`
      select team_name, game_id, role, discord_id from rosters
      where guild_id = ${gid()} and lower(team_name) = ${team.toLowerCase()}
      order by role desc, game_id asc
    `;
  }
  return sql<{ team_name: string; game_id: string; role: string; discord_id: string }>`
    select team_name, game_id, role, discord_id from rosters
    where guild_id = ${gid()}
    order by team_name asc, role desc, game_id asc
  `;
}

export async function lookupGame(gameId: string) {
  const sql = await getSql();
  return sql<{ team_name: string; game_id: string; role: string; discord_id: string }>`
    select team_name, game_id, role, discord_id from rosters
    where guild_id = ${gid()} and game_id = ${gameId} limit 5
  `;
}

export async function banGame(gameId: string, reason: string, actor: string) {
  const sql = await getSql();
  await sql`
    insert into bans (game_id, reason, banned_by, guild_id)
    values (${gameId}, ${reason}, ${actor}, ${gid()})
    on conflict (guild_id, game_id) do update set reason = excluded.reason, banned_by = excluded.banned_by, banned_at = now()
  `;
}

export async function banOf(gameId: string) {
  const sql = await getSql();
  const rows = await sql<{ game_id: string; reason: string; banned_by: string; banned_at: string }>`
    select game_id, reason, banned_by, banned_at from bans
    where guild_id = ${gid()} and game_id = ${gameId}
  `;
  return rows[0] ?? null;
}

export async function rememberRoster(action: string, actor: string, detail: string) {
  const sql = await getSql();
  await sql`insert into roster_history (action, actor_id, detail, guild_id) values (${action}, ${actor}, ${detail.slice(0, 500)}, ${gid()})`;
}

export async function rosterHistory(action: string, limit: number) {
  const sql = await getSql();
  const cap = Math.min(Math.max(limit, 1), 80);
  if (action) {
    return sql<{ action: string; detail: string; actor_id: string; created_at: string }>`
      select action, detail, actor_id, created_at from roster_history
      where guild_id = ${gid()} and action = ${action} order by id desc limit ${cap}
    `;
  }
  return sql<{ action: string; detail: string; actor_id: string; created_at: string }>`
    select action, detail, actor_id, created_at from roster_history
    where guild_id = ${gid()}
    order by id desc limit ${cap}
  `;
}

export async function createAppeal(input: {
  id: string;
  matchRef: string;
  team: string;
  reason: string;
  evidence: string;
  actor: string;
}) {
  const sql = await getSql();
  await sql`
    insert into appeals (id, match_ref, team_name, reason, evidence, created_by, guild_id)
    values (${input.id}, ${input.matchRef}, ${input.team}, ${input.reason}, ${input.evidence}, ${input.actor}, ${gid()})
  `;
}

export async function appealOf(id: string) {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    match_ref: string;
    team_name: string;
    reason: string;
    evidence: string;
    status: string;
    reviewer_id: string;
    decision: string;
    notes: string;
    created_by: string;
  }>`select id, match_ref, team_name, reason, evidence, status, reviewer_id, decision, notes, created_by
      from appeals where id = ${id} and guild_id = ${gid()}`;
  return rows[0] ?? null;
}

export async function patchAppeal(
  id: string,
  patch: { status?: string; reviewer_id?: string; decision?: string; notes?: string },
) {
  const current = await appealOf(id);
  if (!current) return false;
  const sql = await getSql();
  await sql`
    update appeals set
      status = ${patch.status ?? current.status},
      reviewer_id = ${patch.reviewer_id ?? current.reviewer_id},
      decision = ${patch.decision ?? current.decision},
      notes = ${patch.notes ?? current.notes}
    where id = ${id} and guild_id = ${gid()}
  `;
  return true;
}

export async function openTicket(category: string, handle: string, body: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`
    insert into tickets (category, handle, body, guild_id) values (${category}, ${handle}, ${body}, ${gid()}) returning id
  `;
  return Number(rows[0]?.id ?? 0);
}

export async function closeOpenTickets(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`
    update tickets set status = 'closed' where guild_id = ${gid()} and status = 'open' returning id
  `;
  return rows.length;
}

export async function takeSnapshot(id: string, label: string): Promise<void> {
  const sql = await getSql();
  const matches = await listEvents();
  const config = await loadConfig();
  const rosters = await rosterRows();
  const bans = await sql`select game_id, reason, banned_by from bans where guild_id = ${gid()}`;
  const appeals = await sql`select id, match_ref, team_name, reason, status, decision from appeals where guild_id = ${gid()}`;
  const payload = JSON.stringify({ config, matches, rosters, bans, appeals });
  const storedId = `${gid()}:${id}`;
  await sql.query(
    `insert into snapshots (id, label, payload, guild_id) values ($1, $2, $3::jsonb, $4)
     on conflict (id) do update set label = excluded.label, payload = excluded.payload, guild_id = excluded.guild_id, created_at = now()`,
    [storedId, label, payload, gid()],
  );
}

export async function latestSnapshot(id?: string) {
  const sql = await getSql();
  if (id) {
    const stored = `${gid()}:${id}`;
    const rows = await sql<{ id: string; label: string; payload: unknown }>`
      select id, label, payload from snapshots
      where guild_id = ${gid()} and (id = ${stored} or id = ${id})
    `;
    return rows[0] ?? null;
  }
  const rows = await sql<{ id: string; label: string; payload: unknown }>`
    select id, label, payload from snapshots where guild_id = ${gid()} order by created_at desc limit 1
  `;
  return rows[0] ?? null;
}

export async function restoreSnapshot(payload: unknown): Promise<number> {
  const data = (payload ?? {}) as { config?: Partial<BotConfig>; matches?: EventRow[] };
  if (data.config) await patchConfig(data.config);
  const sql = await getSql();
  await sql`delete from matches where guild_id = ${gid()}`;
  let restored = 0;
  for (const row of data.matches ?? []) {
    const id = await insertEvent({
      team1: text(row.team1) || "TBD",
      team2: text(row.team2) || "TBD",
      roundLabel: text(row.round_label),
      groupLabel: text(row.group_label),
      startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : new Date().toISOString(),
      roomName: text(row.room_name),
      judgeName: text(row.judge_name),
      recorderName: text(row.recorder_name),
      remarks: text(row.remarks),
      challonge: text(row.challonge_match),
      commander1: text(row.commander1),
      commander2: text(row.commander2),
      channelId: "",
      imageUrl: text(row.image_url),
    });
    const created = await findEvent(String(id));
    if (created) {
      created.state = text(row.state) || "scheduled";
      created.score_text = text(row.score_text);
      created.winner = text(row.winner);
      created.disqualified = text(row.disqualified);
      created.team1_ready = Boolean(row.team1_ready);
      created.team2_ready = Boolean(row.team2_ready);
      await saveEvent(created);
    }
    restored += 1;
  }
  return restored;
}

export async function counts() {
  const sql = await getSql();
  const matchRows = await sql<{ state: string; n: number }>`
    select state, count(*) as n from matches where guild_id = ${gid()} group by state
  `;
  const roster = await sql<{ n: number }>`select count(*) as n from rosters where guild_id = ${gid()}`;
  const teams = await sql<{ n: number }>`select count(distinct team_name) as n from rosters where guild_id = ${gid()}`;
  const bans = await sql<{ n: number }>`select count(*) as n from bans where guild_id = ${gid()}`;
  const appeals = await sql<{ n: number }>`select count(*) as n from appeals where guild_id = ${gid()} and status <> 'closed'`;
  const tickets = await sql<{ n: number }>`select count(*) as n from tickets where guild_id = ${gid()} and status = 'open'`;
  const auditCount = await sql<{ n: number }>`select count(*) as n from audit_log where guild_id = ${gid()}`;
  return {
    states: matchRows.map((row) => ({ state: row.state, n: Number(row.n) })),
    rosters: Number(roster[0]?.n ?? 0),
    teams: Number(teams[0]?.n ?? 0),
    bans: Number(bans[0]?.n ?? 0),
    appeals: Number(appeals[0]?.n ?? 0),
    tickets: Number(tickets[0]?.n ?? 0),
    audit: Number(auditCount[0]?.n ?? 0),
  };
}

