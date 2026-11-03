import { listCommands } from "./catalog";
import {
  MAP_POOL,
  TRANSITIONS,
  alert,
  clean,
  fail,
  httpUrl,
  isAdministrator,
  mapPool,
  ok,
  warn,
  type CommandContext,
  type Reply,
} from "./protocol";
import { alertRecipients, maskEmail, normalizeAlertEmail, sendEmergency } from "@/lib/mail/resend";
import {
  addRole,
  botToken,
  challonge,
  challongeKey,
  createTextChannel,
  deleteChannel,
  deleteOverwrite,
  discordApi,
  putOverwrite,
  sendEmbed,
  tournamentSlug,
  transcript,
} from "./rest";
import { registerCommands } from "./register";
import {
  abortActive,
  activeCount,
  appealOf,
  audit,
  banGame,
  banOf,
  closeOpenTickets,
  counts,
  createAppeal,
  deleteEvent,
  ensureGuild,
  findEvent,
  guildProfile,
  insertEvent,
  latestSnapshot,
  listAudit,
  listEvents,
  loadConfig,
  lookupGame,
  openTicket,
  patchAppeal,
  patchConfig,
  rememberRoster,
  replaceRosters,
  restoreSnapshot,
  rosterHistory,
  rosterRows,
  saveEvent,
  searchEvents,
  setGuildName,
  setGuildSlug,
  takeSnapshot,
  titleOf,
  whenIso,
  withGuild,
  type BotConfig,
  type EventRow,
} from "./store";

const MATRIX = ["admin_role", "organizer_role", "supervisor_role", "operator_role", "commander_role"] as const;
const SCOPE_FIELDS: Record<string, (keyof BotConfig)[]> = {
  admin: ["admin_role"],
  organizer: ["organizer_role"],
  supervisor: ["supervisor_role"],
  operator: ["operator_role", "organizer_role", "admin_role"],
};

const hits = new Map<string, number[]>();
const guildNames = new Map<string, string>();

function rateOk(ctx: CommandContext): boolean {
  const now = Date.now();
  const key = `${ctx.guildId}:${ctx.userId}:${ctx.key}`;
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 60) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

function missingRoles(config: BotConfig): string[] {
  return MATRIX.filter((field) => !config[field]);
}

async function guildLabel(guildId: string): Promise<string> {
  const cached = guildNames.get(guildId);
  if (cached) return cached;
  if (!botToken()) return "";
  try {
    const guild = (await discordApi(`/guilds/${guildId}`)) as { name?: string };
    const name = guild.name?.trim() ?? "";
    if (name) guildNames.set(guildId, name);
    return name;
  } catch {
    return "";
  }
}

async function gate(ctx: CommandContext): Promise<Reply | null> {
  const spec = listCommands().find((row) => row.command.key === ctx.key)?.command;
  if (!spec) return fail("[ERROR] Unknown command.");
  if (!rateOk(ctx)) return warn("명령을 너무 빨리 보냈어요. 1분 뒤 다시 해 주세요.");
  const config = await loadConfig();
  const missing = missingRoles(config);
  if (missing.length) {
    if (ctx.key === "config_set" && isAdministrator(ctx)) return null;
    return fail(`먼저 /config set으로 역할을 지정해 주세요: ${missing.join(", ")}.`);
  }
  const fields = SCOPE_FIELDS[spec.level] ?? [];
  const allowed = fields.some((field) => {
    const roleId = String(config[field] ?? "");
    return roleId && ctx.roleIds.includes(roleId);
  });
  if (allowed || isAdministrator(ctx)) return null;
  return fail("이 명령은 운영진 역할이 있어야 쓸 수 있어요.");
}

async function runGuarded(ctx: CommandContext): Promise<Reply> {
  try {
    await ensureGuild(ctx.guildId!, await guildLabel(ctx.guildId!));
    const denied = await gate(ctx);
    if (denied) {
      await audit("authorization_denied", ctx.userId, `${ctx.key} ${denied.description}`);
      return denied;
    }
    const result = await run(ctx);
    if (result.tone === "success") await audit(ctx.key, ctx.userId, result.description);
    return result;
  } catch (err) {
    console.error("[discord] command failed", ctx.key, err instanceof Error ? err.message : "error");
    return fail("[ERROR] Command failed.");
  }
}

export async function dispatch(ctx: CommandContext): Promise<Reply> {
  if (!ctx.guildId) return fail("이 명령은 서버 채널에서만 쓸 수 있어요.");
  return withGuild(ctx.guildId, () => runGuarded(ctx));
}

export async function onComponent(customId: string, ctx: CommandContext): Promise<Reply> {
  if (!ctx.guildId) return fail("이 명령은 서버 채널에서만 쓸 수 있어요.");
  return withGuild(ctx.guildId, async () => {
    if (!rateOk(ctx)) return warn("명령을 너무 빨리 보냈어요. 1분 뒤 다시 해 주세요.");
    await ensureGuild(ctx.guildId!, await guildLabel(ctx.guildId!));
    const category = customId.startsWith("ticket:") ? customId.slice("ticket:".length) : "";
    if (category !== "bug" && category !== "report" && category !== "emergency") {
      return fail("[ERROR] Unknown control.");
    }
    const id = await openTicket(category, clean(ctx.username, 24), category === "emergency" ? "비상 버튼" : `${category} uplink`);
    let channelNote = "이 서버에 저장했습니다.";
    if (botToken()) {
      try {
        const channelId = await createTextChannel(ctx.guildId!, `ticket-${id}`);
        if (channelId) channelNote = `채널 <#${channelId}>`;
      } catch {
        channelNote = "이 서버에 저장했습니다. 채널은 만들지 못했습니다.";
      }
    }
    let mailNote = "";
    if (category === "emergency") {
      const config = await loadConfig();
      const profile = await guildProfile();
      const mail = await sendEmergency({
        to: [config.alert_email_1, config.alert_email_2, config.alert_email_3],
        serverName: profile.name || "서버",
        source: "디스코드 비상 버튼",
        handle: clean(ctx.username, 24),
        body: "비상 버튼이 눌렸습니다.",
      });
      mailNote =
        mail === "sent"
          ? " 알림 메일을 보냈습니다."
          : mail === "no_recipient"
            ? " 이 서버에 수신 메일이 없습니다."
            : " 알림 메일은 나가지 않았습니다.";
    }
    return ok(`문의 #${id}가 접수됐어요. ${channelNote}${mailNote}`, { ephemeral: true });
  });
}

export async function autocomplete(ctx: CommandContext): Promise<{ name: string; value: string }[]> {
  if (!ctx.guildId) return [];
  return withGuild(ctx.guildId, async () => {
    if (ctx.focused === "role") {
      return ["judge", "recorder"]
        .filter((role) => role.includes(ctx.query().toLowerCase()))
        .map((role) => ({ name: role, value: role }));
    }
    const rows = await searchEvents(ctx.query());
    return rows.map((row) => ({
      name: `#${row.id} ${titleOf(row)}`.slice(0, 100),
      value: String(row.id),
    }));
  });
}

function versus(raw: string): { team1: string; team2: string } | null {
  const parts = raw.split(/\s+(?:vs\.?|대)\s+/i);
  if (parts.length !== 2) return null;
  const team1 = clean(parts[0], 32);
  const team2 = clean(parts[1], 32);
  if (!team1 || !team2 || team1 === team2) return null;
  return { team1, team2 };
}

function utcStamp(dd: number, mm: number, yyyy: number, hour: number, minute: number): string | null {
  const date = new Date(Date.UTC(yyyy, mm - 1, dd, hour, minute));
  if (date.getUTCFullYear() !== yyyy || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return date.toISOString();
}

function move(row: EventRow, next: string): string | null {
  const allowed = TRANSITIONS[row.state] ?? [];
  if (!allowed.includes(next)) return `Cannot move ${row.state} to ${next}.`;
  row.state = next;
  return null;
}

function clock(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

async function run(ctx: CommandContext): Promise<Reply> {
  switch (ctx.key) {
    case "config_set":
      return configSet(ctx);
    case "config_show":
      return configShow();
    case "events_create":
      return eventsCreate(ctx);
    case "events_edit":
      return eventsEdit(ctx);
    case "events_delete":
      return eventsDelete(ctx);
    case "events_list":
      return eventsList(ctx);
    case "events_show":
      return eventsShow(ctx);
    case "events_results":
      return eventsResults(ctx);
    case "events_staff_resign":
      return staffResign(ctx);
    case "events_reset_tournament":
      return resetTournament(ctx);
    case "events_status":
      return eventsStatus(ctx);
    case "events_checkin_open":
      return shift(ctx, "checkin_open", "Check-in opened.");
    case "events_checkin_close":
      return shift(ctx, "in_progress", "Check-in closed. Match is in progress.");
    case "events_ready":
      return eventsReady(ctx);
    case "events_abort":
      return eventsAbort(ctx);
    case "events_reopen":
      return shift(ctx, "scheduled", "Event reopened as scheduled.");
    case "events_verify":
      return eventsVerify(ctx);
    case "events_archive":
      return eventsArchive(ctx);
    case "events_close":
      return eventsClose(ctx);
    case "events_readiness":
      return readiness(ctx);
    case "health":
      return health();
    case "general_add_to_channel":
      return channelAccess(ctx, true);
    case "general_remove_from_channel":
      return channelAccess(ctx, false);
    case "general_delete_channel":
      return deleteActive(ctx);
    case "general_close_channel":
      return closeChannel(ctx);
    case "ticket_panel":
      return ticketPanel();
    case "ticket_close":
      return ticketClose();
    case "challonge_create":
      return challongeCreate(ctx);
    case "challonge_set":
      return challongeSet(ctx);
    case "challonge_info":
      return challongeInfo();
    case "challonge_participants":
      return challongeParticipants();
    case "challonge_matches":
      return challongeMatches();
    case "challonge_refresh":
      return challongeInfo();
    case "participants_upload":
      return participantsUpload(ctx);
    case "participants_ban":
      return participantsBan(ctx);
    case "participants_check_ban":
      return participantsCheckBan(ctx);
    case "participants_info":
      return participantsInfo(ctx);
    case "participants_lookup":
      return participantsLookup(ctx);
    case "participants_show":
      return participantsInfo(ctx);
    case "participants_sync_roles":
      return participantsSync(ctx);
    case "participants_history":
      return participantsHistory(ctx);
    case "stats_overview":
    case "stats_tournament":
    case "stats_progress":
      return statsOverview();
    case "stats_persistence":
      return statsPersistence();
    case "stats_match":
      return eventsShow(ctx);
    case "stats_matches":
      return eventsList(ctx);
    case "stats_participants":
      return participantsInfo(ctx);
    case "audit_list":
      return auditList(ctx, false);
    case "audit_export":
      return auditList(ctx, true);
    case "appeal_create":
      return appealCreate(ctx);
    case "appeal_status":
      return appealStatus(ctx);
    case "appeal_review":
      return appealReview(ctx);
    case "appeal_decide":
      return appealDecide(ctx);
    case "appeal_close":
      return appealClose(ctx);
    case "maintenance_snapshot":
      return snapshot(ctx);
    case "maintenance_restore":
      return restore(ctx);
    case "random_time":
      return randomTime(ctx);
    case "random_maps":
      return randomMaps(ctx);
    case "generate_bracket":
      return bracket();
    case "report_result":
      return reportResult(ctx);
    case "force_win":
      return forceWin(ctx);
    case "disqualify":
      return disqualify(ctx);
    case "toss":
      return ok(`[SUCCESS] Coin fixed: ${Math.random() < 0.5 ? "HEADS" : "TAILS"}.`);
    case "sync":
      await registerCommands();
      return ok("[SUCCESS] Command tree synchronized for this bot, including new servers.");
    default:
      return fail("[ERROR] Unknown command.");
  }
}

async function configSet(ctx: CommandContext): Promise<Reply> {
  const emailPatch: Partial<BotConfig> = {};
  for (const key of ["alert_email_1", "alert_email_2", "alert_email_3"] as const) {
    const raw = ctx.get(key);
    if (typeof raw !== "string") continue;
    const parsed = normalizeAlertEmail(raw);
    if (parsed == null) return fail(`[ERROR] ${key} is not an email. Send - to clear.`);
    emailPatch[key] = parsed;
  }
  const patch: Partial<BotConfig> = { ...emailPatch };
  const role = (name: keyof BotConfig, option: string) => {
    const picked = ctx.role(option);
    if (picked) (patch as Record<string, string>)[name] = picked.id;
  };
  const channel = (name: keyof BotConfig, option: string) => {
    const picked = ctx.channel(option);
    if (picked) (patch as Record<string, string>)[name] = picked.id;
  };
  role("admin_role", "admin_role");
  role("organizer_role", "organizer_role");
  role("supervisor_role", "supervisor_role");
  role("operator_role", "operator_role");
  role("commander_role", "commander_role");
  channel("appeal_channel", "appeal_channel");
  channel("participants_channel", "participants_channel");
  channel("schedule_channel", "schedule_channel");
  channel("results_channel", "results_channel");
  channel("notification_channel", "notification_channel");
  channel("transcript_channel", "transcript_channel");
  channel("thumbnail_channel", "thumbnail_channel");
  const strict = ctx.bool("strict_authorization");
  if (strict != null) patch.strict_authorization = strict;
  const maxActive = ctx.int("max_active_matches");
  if (maxActive != null) patch.max_active_matches = maxActive;
  const members = ctx.int("max_roster_members_per_team");
  if (members != null) patch.max_roster_members_per_team = members;
  const rows = ctx.int("max_roster_upload_rows");
  if (rows != null) patch.max_roster_upload_rows = rows;
  if (ctx.str("tour_logo")) {
    const logo = httpUrl(ctx.str("tour_logo"));
    if (!logo) return fail("[ERROR] tour_logo must be an http(s) URL.");
    patch.tour_logo = logo;
  }
  if (ctx.str("challonge_tournament")) patch.challonge_tournament = clean(ctx.str("challonge_tournament"), 120);
  let named = false;
  if (ctx.str("public_name")) {
    await setGuildName(clean(ctx.str("public_name"), 40));
    named = true;
  }
  if (ctx.str("public_slug")) {
    const problem = await setGuildSlug(clean(ctx.str("public_slug"), 32));
    if (problem) return fail(`[ERROR] ${problem}`);
    named = true;
  }
  if (!Object.keys(patch).length && !named) return warn("[ALERT] No configuration fields were supplied.");
  if (Object.keys(patch).length) await patchConfig(patch);
  const missing = missingRoles(await loadConfig());
  const profile = await guildProfile();
  const saved = await loadConfig();
  const alertCount = alertRecipients([saved.alert_email_1, saved.alert_email_2, saved.alert_email_3]).length;
  const tail = missing.length ? ` Still locked: ${missing.join(", ")}.` : " Role matrix ready.";
  return ok(`[SUCCESS] Configuration updated. Board: /s/${profile.slug}. Alerts ${alertCount}.${tail}`);
}

async function configShow(): Promise<Reply> {
  const config = await loadConfig();
  const profile = await guildProfile();
  const mention = (id: string, kind: "@&" | "#") => (id ? `<${kind}${id}>` : "Not Configured");
  const missing = missingRoles(config);
  const alerts = alertRecipients([config.alert_email_1, config.alert_email_2, config.alert_email_3]);
  return alert("[ALERT] Configuration registry queried.", {
    title: "[ALERT] Tournament Configuration",
    fields: [
      { name: "server", value: `${profile.name || "server"} · /s/${profile.slug || "?"}` },
      { name: "admin_role", value: mention(config.admin_role, "@&"), inline: true },
      { name: "organizer_role", value: mention(config.organizer_role, "@&"), inline: true },
      { name: "supervisor_role", value: mention(config.supervisor_role, "@&"), inline: true },
      { name: "operator_role", value: mention(config.operator_role, "@&"), inline: true },
      { name: "commander_role", value: mention(config.commander_role, "@&"), inline: true },
      { name: "authorization", value: missing.length ? `LOCKED: ${missing.join(", ")}` : "READY" },
      { name: "schedule_channel", value: mention(config.schedule_channel, "#"), inline: true },
      { name: "results_channel", value: mention(config.results_channel, "#"), inline: true },
      { name: "challonge_tournament", value: config.challonge_tournament || "Not Configured" },
      { name: "max_active_matches", value: String(config.max_active_matches), inline: true },
      { name: "alerts", value: alerts.length ? alerts.map(maskEmail).join(", ") : "없음" },
    ],
  });
}

async function eventsCreate(ctx: CommandContext): Promise<Reply> {
  const config = await loadConfig();
  const live = await activeCount();
  if (live >= config.max_active_matches) return fail("[ERROR] Active match cap reached.");
  const names = versus(ctx.str("match"));
  const challongeId = names ? "" : clean(ctx.str("match"), 40);
  if (!names && !/^\d+$/.test(challongeId)) return fail("[ERROR] match must be an id or 'Team A vs Team B'.");
  const stamp = utcStamp(
    ctx.int("dd") ?? 0,
    ctx.int("mm") ?? 0,
    ctx.int("yyyy") ?? 0,
    ctx.int("hour") ?? 0,
    ctx.int("minute") ?? 0,
  );
  if (!stamp) return fail("[ERROR] Date is not a real UTC timestamp.");
  const id = await insertEvent({
    team1: names?.team1 || "TBD",
    team2: names?.team2 || "TBD",
    roundLabel: clean(ctx.str("round_no"), 24),
    groupLabel: clean(ctx.str("group_name"), 24),
    startsAt: stamp,
    roomName: clean(ctx.str("tour_name"), 40),
    judgeName: ctx.user("judge")?.name ?? "",
    recorderName: ctx.user("recorder")?.name ?? "",
    remarks: clean(ctx.str("remarks"), 180),
    challonge: challongeId,
    commander1: ctx.user("commander1")?.name ?? "",
    commander2: ctx.user("commander2")?.name ?? "",
    channelId: ctx.channel("channel")?.id ?? "",
    imageUrl: httpUrl(ctx.str("image_url")),
  });
  const profile = await guildProfile();
  return ok(`[SUCCESS] Match #${id} scheduled. Public board: /s/${profile.slug}.`);
}

async function eventsEdit(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  if (ctx.int("dd") && ctx.int("mm") && ctx.int("yyyy") && ctx.int("hour") != null && ctx.int("minute") != null) {
    const stamp = utcStamp(ctx.int("dd")!, ctx.int("mm")!, ctx.int("yyyy")!, ctx.int("hour")!, ctx.int("minute")!);
    if (!stamp) return fail("[ERROR] Date is not a real UTC timestamp.");
    row.starts_at = stamp;
  }
  if (ctx.str("tour_name")) row.room_name = clean(ctx.str("tour_name"), 40);
  if (ctx.str("group_name")) row.group_label = clean(ctx.str("group_name"), 24);
  if (ctx.str("round_no")) row.round_label = clean(ctx.str("round_no"), 24);
  if (ctx.str("remarks")) row.remarks = clean(ctx.str("remarks"), 180);
  if (ctx.user("judge")) row.judge_name = ctx.user("judge")!.name;
  if (ctx.user("recorder")) row.recorder_name = ctx.user("recorder")!.name;
  if (ctx.user("commander1")) row.commander1 = ctx.user("commander1")!.name;
  if (ctx.user("commander2")) row.commander2 = ctx.user("commander2")!.name;
  if (ctx.channel("channel")) row.channel_id = ctx.channel("channel")!.id;
  if (ctx.str("image_url")) row.image_url = httpUrl(ctx.str("image_url"));
  await saveEvent(row);
  return ok(`[SUCCESS] Match #${row.id} updated.`);
}

async function eventsDelete(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  await deleteEvent(row.id);
  return ok(`[SUCCESS] Match #${row.id} deleted. ${clean(ctx.str("reason"), 80)}`);
}

async function eventsList(ctx: CommandContext): Promise<Reply> {
  let rows = await listEvents();
  const status = clean(ctx.str("status"), 40).toLowerCase();
  const team = clean(ctx.str("team"), 32).toLowerCase();
  if (status) rows = rows.filter((row) => row.state === status || row.status === status);
  if (team) rows = rows.filter((row) => row.team1.toLowerCase().includes(team) || row.team2.toLowerCase().includes(team));
  const lines = rows.slice(0, 15).map((row) => `#${row.id} ${titleOf(row)} · ${row.state} · ${whenIso(row.starts_at)}`);
  return alert(`[ALERT] ${rows.length} match packet(s) on this server.`, {
    fields: [{ name: "Queue", value: lines.join("\n") || "No matches." }],
  });
}

async function eventsShow(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match") || ctx.str("match_id") || String(ctx.int("match_id") ?? ""));
  if (!row) return fail("[ERROR] Match not found in this server.");
  return alert(`#${row.id} ${titleOf(row)}`, {
    fields: [
      { name: "State", value: `${row.state} / ${row.status}`, inline: true },
      { name: "When", value: whenIso(row.starts_at), inline: true },
      { name: "Staff", value: `Judge ${row.judge_name || "—"} · Recorder ${row.recorder_name || "—"}` },
      { name: "Ready", value: `A ${row.team1_ready ? "yes" : "no"} · B ${row.team2_ready ? "yes" : "no"}`, inline: true },
      { name: "Score", value: row.score_text || "—", inline: true },
      { name: "Winner", value: row.winner || "—", inline: true },
    ],
  });
}

async function eventsResults(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("event"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const a = ctx.int("team1_score");
  const b = ctx.int("team2_score");
  if (a == null || b == null) return fail("[ERROR] Both scores are required.");
  row.score_text = `${a}-${b}`;
  row.winner = a === b ? "" : a > b ? row.team1 : row.team2;
  row.remarks = clean([row.remarks, ctx.str("remarks")].filter(Boolean).join(" · "), 180);
  const blocked = move(row, "result_submitted");
  if (blocked && row.state !== "result_submitted") row.state = "result_submitted";
  await saveEvent(row);
  const config = await loadConfig();
  if (config.results_channel) {
    await sendEmbed(
      config.results_channel,
      `#${row.id} ${titleOf(row)} ${row.score_text}${row.winner ? ` · ${row.winner}` : ""}`,
      "[SUCCESS] Result",
    ).catch(() => undefined);
  }
  return ok(`[SUCCESS] Result stored for #${row.id}. ${row.score_text}.`);
}

async function staffResign(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const role = clean(ctx.str("role"), 16).toLowerCase();
  if (role === "judge") row.judge_name = "";
  else if (role === "recorder") row.recorder_name = "";
  else return fail("[ERROR] role must be judge or recorder.");
  await saveEvent(row);
  return ok(`[SUCCESS] ${role} cleared on #${row.id}. ${clean(ctx.str("reason"), 80)}`);
}

async function resetTournament(ctx: CommandContext): Promise<Reply> {
  if (ctx.str("confirm") !== "RESET") return warn("[ALERT] confirm must be RESET.");
  const count = await abortActive();
  return ok(`[SUCCESS] Aborted ${count} active match packet(s) on this server.`);
}

async function eventsStatus(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  return alert(`#${row.id} ${row.state}`, {
    fields: [
      { name: "Board", value: row.status, inline: true },
      { name: "Ready", value: `${row.team1_ready}/${row.team2_ready}`, inline: true },
    ],
  });
}

async function shift(ctx: CommandContext, next: string, done: string): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  if (row.state !== next) {
    const blocked = move(row, next);
    if (blocked) return fail(`[ERROR] ${blocked}`);
  }
  await saveEvent(row);
  return ok(`[SUCCESS] #${row.id} ${done}`);
}

async function eventsReady(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const side = clean(ctx.str("side"), 12).toLowerCase();
  if (side === "team1") row.team1_ready = true;
  else if (side === "team2") row.team2_ready = true;
  else return fail("[ERROR] side must be team1 or team2.");
  await saveEvent(row);
  return ok(`[SUCCESS] ${side} ready on #${row.id}.`);
}

async function eventsAbort(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const blocked = move(row, "aborted");
  if (blocked) return fail(`[ERROR] ${blocked}`);
  row.remarks = clean([row.remarks, ctx.str("reason")].filter(Boolean).join(" · "), 180);
  await saveEvent(row);
  return ok(`[SUCCESS] #${row.id} aborted.`);
}

async function eventsVerify(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  if (ctx.str("winner")) row.winner = clean(ctx.str("winner"), 32);
  const blocked = move(row, "verified");
  if (blocked && row.state !== "verified") return fail(`[ERROR] ${blocked}`);
  await saveEvent(row);
  return ok(`[SUCCESS] #${row.id} verified.`);
}

async function eventsArchive(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(ctx.str("match"));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const blocked = move(row, "archived");
  if (blocked) return fail(`[ERROR] ${blocked}`);
  if (ctx.str("reason")) row.remarks = clean(ctx.str("reason"), 180);
  await saveEvent(row);
  return ok(`[SUCCESS] #${row.id} archived.`);
}

async function eventsClose(ctx: CommandContext): Promise<Reply> {
  const row = ctx.str("match") ? await findEvent(ctx.str("match")) : null;
  const channelId = row?.channel_id || ctx.channelId || "";
  if (!channelId) return fail("[ERROR] No match channel to close.");
  let saved = "";
  if (botToken()) {
    saved = await transcript(channelId).catch(() => "");
    const config = await loadConfig();
    if (saved && config.transcript_channel) {
      await sendEmbed(config.transcript_channel, saved, `[ALERT] Transcript #${row?.id ?? channelId}`).catch(() => undefined);
    }
    await deleteChannel(channelId).catch(() => undefined);
  }
  if (row) {
    row.channel_id = "";
    await saveEvent(row);
  }
  return ok(`[SUCCESS] Channel closed.${saved ? " Transcript posted." : ""}`);
}

async function readiness(ctx: CommandContext): Promise<Reply> {
  const rows = ctx.str("match")
    ? [await findEvent(ctx.str("match"))].filter((row): row is EventRow => Boolean(row))
    : (await listEvents()).filter((row) => ["scheduled", "checkin_open", "in_progress"].includes(row.state));
  const lines = rows.slice(0, 12).map((row) => `#${row.id} ${titleOf(row)} A:${row.team1_ready ? "Y" : "N"} B:${row.team2_ready ? "Y" : "N"}`);
  return alert(`[ALERT] ${rows.length} open packet(s).`, {
    fields: [{ name: "Readiness", value: lines.join("\n") || "None." }],
  });
}

async function health(): Promise<Reply> {
  const summary = await counts();
  const config = await loadConfig();
  const missing = missingRoles(config);
  return alert("[ALERT] Subsystem health.", {
    fields: [
      { name: "Roles", value: missing.length ? missing.join(", ") : "ready", inline: true },
      { name: "Open tickets", value: String(summary.tickets), inline: true },
      { name: "Rosters", value: String(summary.rosters), inline: true },
      { name: "States", value: summary.states.map((row) => `${row.state}:${row.n}`).join(" ") || "none" },
    ],
  });
}

async function channelAccess(ctx: CommandContext, grant: boolean): Promise<Reply> {
  const target = ctx.mention("member_role");
  if (!target || !ctx.channelId || !ctx.guildId) return fail("[ERROR] member_role and an active channel are required.");
  if (!botToken()) return fail("[ERROR] DISCORD_BOT_TOKEN is not configured.");
  if (grant) await putOverwrite(ctx.channelId, target.id, target.kind === "role" ? "role" : "user", "1024", "0");
  else await deleteOverwrite(ctx.channelId, target.id);
  return ok(`[SUCCESS] ${grant ? "Granted" : "Revoked"} ${target.kind} ${target.id}.`);
}

async function deleteActive(ctx: CommandContext): Promise<Reply> {
  if (!ctx.channelId) return fail("[ERROR] No active channel.");
  if (!botToken()) return fail("[ERROR] DISCORD_BOT_TOKEN is not configured.");
  const save = ctx.bool("save_transcript") !== false;
  if (save) {
    const text = await transcript(ctx.channelId).catch(() => "");
    const config = await loadConfig();
    if (text && config.transcript_channel) await sendEmbed(config.transcript_channel, text, "[ALERT] Transcript").catch(() => undefined);
  }
  await deleteChannel(ctx.channelId);
  return ok("[SUCCESS] Channel deleted.");
}

async function closeChannel(ctx: CommandContext): Promise<Reply> {
  const channel = ctx.channel("channel");
  if (!channel) return fail("[ERROR] channel is required.");
  if (!botToken()) return fail("[ERROR] DISCORD_BOT_TOKEN is not configured.");
  if (ctx.bool("save_transcript") !== false) {
    const text = await transcript(channel.id).catch(() => "");
    const config = await loadConfig();
    if (text && config.transcript_channel) await sendEmbed(config.transcript_channel, text, "[ALERT] Transcript").catch(() => undefined);
  }
  await putOverwrite(channel.id, ctx.guildId!, "role", "0", "1024").catch(() => undefined);
  return ok(`[SUCCESS] <#${channel.id}> locked.`);
}

function ticketPanel(): Reply {
  return ok("[SUCCESS] Ticket intake is live in this channel.", {
    buttons: [
      { id: "ticket:bug", label: "버그", style: 1 },
      { id: "ticket:report", label: "신고", style: 2 },
      { id: "ticket:emergency", label: "비상", style: 4 },
    ],
  });
}

async function ticketClose(): Promise<Reply> {
  const count = await closeOpenTickets();
  return ok(`[SUCCESS] Closed ${count} open ticket(s) on this server.`);
}

type ChallongeParticipant = { participant?: { id?: number; name?: string } };
type ChallongeMatch = { match?: { id?: number; player1_id?: number; player2_id?: number; round?: number; state?: string } };

async function challongeBundle() {
  const config = await loadConfig();
  const slug = tournamentSlug(config.challonge_tournament);
  if (!slug) return { error: "[ERROR] challonge_tournament is not configured." as const, slug: "", parts: [], matches: [] };
  if (!challongeKey()) return { error: "[ERROR] CHALLONGE_API_KEY is not configured." as const, slug, parts: [], matches: [] };
  const parts = (await challonge(`/tournaments/${encodeURIComponent(slug)}/participants.json`)) as ChallongeParticipant[];
  const matches = (await challonge(`/tournaments/${encodeURIComponent(slug)}/matches.json`)) as ChallongeMatch[];
  return { error: null, slug, parts: Array.isArray(parts) ? parts : [], matches: Array.isArray(matches) ? matches : [] };
}

function nameMap(parts: ChallongeParticipant[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of parts) {
    const id = row.participant?.id;
    const name = row.participant?.name;
    if (id && name) map.set(id, name);
  }
  return map;
}

async function challongeCreate(ctx: CommandContext): Promise<Reply> {
  const bundle = await challongeBundle();
  if (bundle.error) return fail(bundle.error);
  if (!ctx.guildId || !botToken()) return fail("[ERROR] DISCORD_BOT_TOKEN is not configured.");
  const config = await loadConfig();
  const names = nameMap(bundle.parts);
  const parent = ctx.channel("category")?.id;
  let created = 0;
  for (const item of bundle.matches) {
    if (created >= config.match_channel_batch_limit) break;
    const id = item.match?.id;
    if (!id) continue;
    if (await findEvent(String(id))) continue;
    const team1 = names.get(item.match?.player1_id ?? 0) || "TBD";
    const team2 = names.get(item.match?.player2_id ?? 0) || "TBD";
    const channelId = await createTextChannel(ctx.guildId, `m-${id}`, parent).catch(() => "");
    await insertEvent({
      team1: clean(team1, 32) || "TBD",
      team2: clean(team2, 32) || "TBD",
      roundLabel: String(item.match?.round ?? ""),
      groupLabel: "",
      startsAt: new Date().toISOString(),
      roomName: bundle.slug,
      judgeName: "",
      recorderName: "",
      remarks: "",
      challonge: String(id),
      commander1: "",
      commander2: "",
      channelId,
      imageUrl: "",
    });
    created += 1;
  }
  return ok(`[SUCCESS] Match channels created: ${created}.`);
}

async function challongeSet(ctx: CommandContext): Promise<Reply> {
  const tournament = clean(ctx.str("tournament"), 120);
  if (!tournament) return fail("[ERROR] tournament is required.");
  await patchConfig({ challonge_tournament: tournament });
  const file = ctx.attachment("commanders_csv");
  if (file) {
    const loaded = await readRoster(file, await loadConfig());
    if (typeof loaded === "string") return fail(loaded);
    await replaceRosters(loaded);
    await rememberRoster("upload", ctx.userId, `${loaded.length} rows via challonge set`);
  }
  return ok(`[SUCCESS] Challonge set to ${tournamentSlug(tournament)}.`);
}

async function challongeInfo(): Promise<Reply> {
  const config = await loadConfig();
  return alert("[ALERT] Challonge link.", {
    fields: [
      { name: "Tournament", value: config.challonge_tournament || "Not Configured" },
      { name: "Key", value: challongeKey() ? "present" : "missing", inline: true },
    ],
  });
}

async function challongeParticipants(): Promise<Reply> {
  const bundle = await challongeBundle();
  if (bundle.error) return fail(bundle.error);
  const lines = bundle.parts.slice(0, 20).map((row) => row.participant?.name || "—");
  return alert(`[ALERT] ${bundle.parts.length} participants.`, {
    fields: [{ name: bundle.slug, value: lines.join("\n") || "None." }],
  });
}

async function challongeMatches(): Promise<Reply> {
  const bundle = await challongeBundle();
  if (bundle.error) return fail(bundle.error);
  const names = nameMap(bundle.parts);
  const lines = bundle.matches.slice(0, 15).map((row) => {
    const a = names.get(row.match?.player1_id ?? 0) || "?";
    const b = names.get(row.match?.player2_id ?? 0) || "?";
    return `#${row.match?.id} ${a} vs ${b} · ${row.match?.state || "pending"}`;
  });
  return alert(`[ALERT] ${bundle.matches.length} matches.`, {
    fields: [{ name: "Queue", value: lines.join("\n") || "None." }],
  });
}

async function readRoster(file: { url: string; filename: string; size: number }, config: BotConfig) {
  if (file.size > 1_500_000) return "[ERROR] Roster file is too large.";
  if (!file.filename.toLowerCase().endsWith(".csv")) return "[ERROR] Roster must be a CSV file.";
  const text = await fetch(file.url).then((response) => response.text());
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return "[ERROR] Roster CSV is empty.";
  if (lines.length - 1 > config.max_roster_upload_rows) return "[ERROR] Roster exceeds the row cap.";
  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase().replace(/^\ufeff/, ""));
  const at = (...names: string[]) => header.findIndex((cell) => names.includes(cell));
  const teamI = at("team", "team_name");
  const gameI = at("game_id", "id");
  const roleI = at("role");
  const discordI = at("discord_id", "discord");
  if (teamI < 0 || gameI < 0) return "[ERROR] CSV needs team and game_id columns.";
  const rows: { teamName: string; gameId: string; role: string; discordId: string }[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((cell) => cell.trim());
    const teamName = clean(cells[teamI] ?? "", 40);
    const gameId = clean(cells[gameI] ?? "", 40);
    if (!teamName || !gameId) continue;
    rows.push({
      teamName,
      gameId,
      role: clean(roleI >= 0 ? cells[roleI] ?? "member" : "member", 16) || "member",
      discordId: clean(discordI >= 0 ? cells[discordI] ?? "" : "", 24),
    });
  }
  return rows;
}

async function participantsUpload(ctx: CommandContext): Promise<Reply> {
  const file = ctx.attachment("roster_file");
  if (!file) return fail("[ERROR] roster_file is required.");
  const config = await loadConfig();
  const loaded = await readRoster(file, config);
  if (typeof loaded === "string") return fail(loaded);
  await replaceRosters(loaded);
  await rememberRoster("upload", ctx.userId, `${loaded.length} rows`);
  return ok(`[SUCCESS] Roster replaced. ${loaded.length} rows on this server.`);
}

async function participantsBan(ctx: CommandContext): Promise<Reply> {
  const gameId = clean(ctx.str("game_id"), 40);
  const reason = clean(ctx.str("reason"), 120);
  if (!gameId || !reason) return fail("[ERROR] game_id and reason are required.");
  await banGame(gameId, reason, ctx.userId);
  return ok(`[SUCCESS] ${gameId} banned on this server.`);
}

async function participantsCheckBan(ctx: CommandContext): Promise<Reply> {
  const row = await banOf(clean(ctx.str("game_id"), 40));
  if (!row) return alert("[ALERT] Not banned on this server.");
  return alert(`[ALERT] Banned. ${row.reason}`);
}

async function participantsInfo(ctx: CommandContext): Promise<Reply> {
  const team = clean(ctx.str("team_name") || ctx.str("team"), 40);
  const rows = await rosterRows(team || undefined);
  const lines = rows.slice(0, 20).map((row) => `${row.team_name} · ${row.game_id} · ${row.role}`);
  return alert(`[ALERT] ${rows.length} roster row(s).`, {
    fields: [{ name: team || "All teams", value: lines.join("\n") || "None." }],
  });
}

async function participantsLookup(ctx: CommandContext): Promise<Reply> {
  const rows = await lookupGame(clean(ctx.str("game_id"), 40));
  if (!rows.length) return fail("[ERROR] No roster row for that game id on this server.");
  return alert(rows.map((row) => `${row.team_name} · ${row.role}`).join("\n"));
}

async function participantsSync(ctx: CommandContext): Promise<Reply> {
  const config = await loadConfig();
  if (!config.commander_role || !ctx.guildId || !botToken()) {
    return fail("[ERROR] commander_role and the bot token are required.");
  }
  const rows = await rosterRows();
  let count = 0;
  for (const row of rows) {
    if (row.role.toLowerCase() !== "commander" || !/^\d+$/.test(row.discord_id)) continue;
    await addRole(ctx.guildId, row.discord_id, config.commander_role).catch(() => undefined);
    count += 1;
  }
  return ok(`[SUCCESS] Commander role sync attempted for ${count} row(s).`);
}

async function participantsHistory(ctx: CommandContext): Promise<Reply> {
  const rows = await rosterHistory(clean(ctx.str("action"), 40), ctx.int("limit") ?? 15);
  const lines = rows.map((row) => `${row.action} ${row.detail}`);
  return alert(`[ALERT] ${rows.length} roster event(s).`, {
    fields: [{ name: "History", value: lines.join("\n").slice(0, 900) || "None." }],
  });
}

async function statsOverview(): Promise<Reply> {
  const summary = await counts();
  return alert("[ALERT] Server telemetry.", {
    fields: [
      { name: "Teams", value: String(summary.teams), inline: true },
      { name: "Bans", value: String(summary.bans), inline: true },
      { name: "Appeals", value: String(summary.appeals), inline: true },
      { name: "States", value: summary.states.map((row) => `${row.state}:${row.n}`).join(" ") || "none" },
    ],
  });
}

async function statsPersistence(): Promise<Reply> {
  const snap = await latestSnapshot();
  return alert("[ALERT] Latest snapshot on this server.", {
    fields: [{ name: "Snapshot", value: snap ? `${snap.id} · ${snap.label || "unlabeled"}` : "None." }],
  });
}

async function auditList(ctx: CommandContext, asFile: boolean): Promise<Reply> {
  const actor = ctx.str("actor_id");
  if (actor && !/^\d+$/.test(actor)) return fail("[ERROR] actor_id must be a numeric Discord identifier.");
  const rows = await listAudit(ctx.int("limit") ?? (asFile ? 100 : 15), clean(ctx.str("action"), 40) || undefined, actor || undefined);
  const lines = rows.map((row) => `#${row.id} ${row.action} ${row.actor_id} ${row.detail}`);
  return alert(`[ALERT] ${rows.length} audit row(s) on this server.`, {
    fileText: asFile ? lines.join("\n") : undefined,
    fields: asFile ? [] : [{ name: "Events", value: lines.slice(0, 15).join("\n").slice(0, 900) || "No records." }],
  });
}

async function appealCreate(ctx: CommandContext): Promise<Reply> {
  const id = `APL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const evidence = ["evidence1", "evidence2", "evidence3"]
    .map((name) => ctx.attachment(name)?.url)
    .filter((url): url is string => Boolean(url))
    .join("\n");
  await createAppeal({
    id,
    matchRef: clean(ctx.str("match_id"), 40),
    team: clean(ctx.str("team"), 32),
    reason: clean(ctx.str("reason"), 300),
    evidence,
    actor: ctx.userId,
  });
  const config = await loadConfig();
  if (config.appeal_channel) {
    await sendEmbed(config.appeal_channel, `${id} ${ctx.str("team")}: ${ctx.str("reason")}`, "[ALERT] Appeal").catch(() => undefined);
  }
  return ok(`[SUCCESS] Appeal ${id} opened on this server.`);
}

async function appealStatus(ctx: CommandContext): Promise<Reply> {
  const row = await appealOf(clean(ctx.str("appeal_id"), 20));
  if (!row) return fail("[ALERT] Appeal not found on this server.");
  return alert(`${row.id} · ${row.status}`, {
    fields: [
      { name: "Team", value: row.team_name || "—", inline: true },
      { name: "Match", value: row.match_ref || "—", inline: true },
      { name: "Reason", value: row.reason || "—" },
    ],
  });
}

async function appealReview(ctx: CommandContext): Promise<Reply> {
  const id = clean(ctx.str("appeal_id"), 20);
  const updated = await patchAppeal(id, { status: "review", notes: clean(ctx.str("notes"), 300), reviewer_id: ctx.userId });
  if (!updated) return fail("[ALERT] Appeal not found on this server.");
  return ok(`[SUCCESS] Appeal ${id} in review.`);
}

async function appealDecide(ctx: CommandContext): Promise<Reply> {
  const id = clean(ctx.str("appeal_id"), 20);
  const closing = ctx.bool("close");
  const updated = await patchAppeal(id, {
    status: closing === false ? "decided" : "closed",
    decision: clean(`${ctx.str("winner")} ${ctx.str("reason")}`.trim(), 300),
    reviewer_id: ctx.userId,
  });
  if (!updated) return fail("[ALERT] Appeal not found on this server.");
  return ok(`[SUCCESS] Appeal ${id} decided.`);
}

async function appealClose(ctx: CommandContext): Promise<Reply> {
  const id = clean(ctx.str("appeal_id"), 20);
  const updated = await patchAppeal(id, { status: "closed", notes: clean(ctx.str("reason"), 200) });
  if (!updated) return fail("[ALERT] Appeal not found on this server.");
  return ok(`[SUCCESS] Appeal ${id} closed.`);
}

async function snapshot(ctx: CommandContext): Promise<Reply> {
  const id = `SNP-${Date.now().toString(36).toUpperCase()}`;
  await takeSnapshot(id, clean(ctx.str("label"), 40));
  return ok(`[SUCCESS] Snapshot ${id} stored for this server only.`);
}

async function restore(ctx: CommandContext): Promise<Reply> {
  if (ctx.str("confirm") !== "RESTORE") return warn("[ALERT] confirm must be RESTORE.");
  const snap = await latestSnapshot(clean(ctx.str("snapshot_id"), 40) || undefined);
  if (!snap) return fail("[ERROR] Snapshot not found on this server.");
  const count = await restoreSnapshot(snap.payload);
  return ok(`[SUCCESS] Restored ${snap.id}. Match packets: ${count}.`);
}

function randomTime(ctx: CommandContext): Reply {
  const start = clock(ctx.str("start"));
  const end = clock(ctx.str("end"));
  if (!start || !end) return fail("[ERROR] Time format invalid. Use HH:MM in UTC.");
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  if (endMin <= startMin) return fail("[ERROR] End time must be after start time.");
  const slots: number[] = [];
  for (let minute = startMin; minute <= endMin; minute += 30) slots.push(minute);
  const picked = slots[Math.floor(Math.random() * slots.length)] ?? startMin;
  const hour = Math.floor(picked / 60);
  const minute = picked % 60;
  const utc = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} UTC`;
  const kstH = (hour + 9) % 24;
  const kst = `${String(kstH).padStart(2, "0")}:${String(minute).padStart(2, "0")} KST`;
  return ok(`[SUCCESS] Drawn slot: ${utc} · ${kst}.`);
}

function randomMaps(ctx: CommandContext): Reply {
  const count = ctx.int("count");
  if (!count) return fail("[ERROR] count is required.");
  const pool = mapPool(ctx.bool("include_mini") === true);
  const bag = [...pool];
  const drawn: string[] = [];
  while (drawn.length < count && bag.length) {
    const index = Math.floor(Math.random() * bag.length);
    drawn.push(bag.splice(index, 1)[0] ?? "");
  }
  if (!drawn.length) return fail("[ERROR] Map pool is empty.");
  return ok(`[SUCCESS] ${drawn.join(", ")}. Atlas size ${MAP_POOL.length}.`);
}

async function bracket(): Promise<Reply> {
  const bundle = await challongeBundle();
  if (bundle.error) return fail(bundle.error);
  const names = nameMap(bundle.parts);
  const lines = bundle.matches.slice(0, 20).map((row) => {
    const a = names.get(row.match?.player1_id ?? 0) || "TBD";
    const b = names.get(row.match?.player2_id ?? 0) || "TBD";
    return `R${row.match?.round ?? "?"} ${a} vs ${b}`;
  });
  return alert(`[ALERT] Bracket ${bundle.slug}.`, {
    fields: [{ name: "Matches", value: lines.join("\n") || "None." }],
  });
}

async function reportResult(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(String(ctx.int("match_id") ?? ""));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const a = ctx.int("team_a_score");
  const b = ctx.int("team_b_score");
  if (a == null || b == null) return fail("[ERROR] Both scores are required.");
  row.score_text = `${a}-${b}`;
  row.winner = a === b ? "" : a > b ? row.team1 : row.team2;
  if (ctx.str("notes")) row.remarks = clean(ctx.str("notes"), 180);
  const proof = ctx.attachment("proof_image");
  if (proof) row.image_url = proof.url;
  row.state = "result_submitted";
  await saveEvent(row);
  return ok(`[SUCCESS] Reported #${row.id} ${row.score_text}.`);
}

async function forceWin(ctx: CommandContext): Promise<Reply> {
  const row = await findEvent(String(ctx.int("match_id") ?? ""));
  if (!row) return fail("[ERROR] Match not found in this server.");
  const winner = clean(ctx.str("winner_team"), 32);
  if (winner !== row.team1 && winner !== row.team2) return fail("[ERROR] winner_team must be one of the two teams.");
  row.winner = winner;
  row.score_text = clean(ctx.str("score_csv"), 16);
  row.state = "verified";
  await saveEvent(row);
  return ok(`[SUCCESS] Forced win for ${winner} on #${row.id}.`);
}

async function disqualify(ctx: CommandContext): Promise<Reply> {
  const team = clean(ctx.str("team_name"), 32);
  const reason = clean(ctx.str("reason"), 120);
  if (!team || !reason) return fail("[ERROR] team_name and reason are required.");
  const matchId = ctx.int("match_id");
  const targets = matchId != null
    ? [await findEvent(String(matchId))].filter((row): row is EventRow => Boolean(row))
    : (await listEvents()).filter((row) => row.team1 === team || row.team2 === team);
  if (!targets.length) return fail("[ERROR] No match on this server for that team.");
  for (const row of targets) {
    row.disqualified = team;
    row.winner = row.team1 === team ? row.team2 : row.team1;
    row.state = "archived";
    row.remarks = clean([row.remarks, reason].filter(Boolean).join(" · "), 180);
    await saveEvent(row);
  }
  return ok(`[SUCCESS] ${team} disqualified on ${targets.length} packet(s).`);
}
