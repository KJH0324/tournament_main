export type OptType =
  | "string"
  | "integer"
  | "boolean"
  | "user"
  | "channel"
  | "role"
  | "attachment"
  | "mentionable";

export type OptSpec = {
  name: string;
  description: string;
  type: OptType;
  required?: boolean;
  autocomplete?: boolean;
  min?: number;
  max?: number;
  channelTypes?: number[];
};

export type ScopeLevel = "admin" | "organizer" | "supervisor" | "operator";

export type CommandSpec = {
  name: string;
  description: string;
  key: string;
  level: ScopeLevel;
  options?: OptSpec[];
};

export type GroupSpec = {
  name: string;
  description: string;
  commands: CommandSpec[];
};

const matchOpt = (name: string, description: string, required = true): OptSpec => ({
  name,
  description,
  type: "string",
  required,
  autocomplete: true,
});

export const groups: GroupSpec[] = [
  {
    name: "config",
    description: "Tournament configuration controls",
    commands: [
      {
        name: "set",
        description: "Configure tournament options.",
        key: "config_set",
        level: "admin",
        options: [
          { name: "admin_role", description: "Admin role", type: "role" },
          { name: "organizer_role", description: "Organizer role", type: "role" },
          { name: "supervisor_role", description: "Supervisor role", type: "role" },
          { name: "operator_role", description: "Operator role", type: "role" },
          { name: "commander_role", description: "Commander role", type: "role" },
          { name: "strict_authorization", description: "Deny fallback when roles are missing", type: "boolean" },
          { name: "max_active_matches", description: "Maximum concurrent active matches", type: "integer", min: 0, max: 128 },
          { name: "max_roster_members_per_team", description: "Maximum members tracked per team", type: "integer", min: 1, max: 6 },
          { name: "max_roster_upload_rows", description: "Maximum rows in a roster upload", type: "integer", min: 20, max: 20000 },
          { name: "appeal_channel", description: "Appeal review channel", type: "channel", channelTypes: [0] },
          { name: "participants_channel", description: "Participant roster channel", type: "channel", channelTypes: [0] },
          { name: "schedule_channel", description: "Schedule channel", type: "channel", channelTypes: [0] },
          { name: "results_channel", description: "Result announcement channel", type: "channel", channelTypes: [0] },
          { name: "notification_channel", description: "Notification channel", type: "channel", channelTypes: [0] },
          { name: "transcript_channel", description: "Transcript channel", type: "channel", channelTypes: [0] },
          { name: "thumbnail_channel", description: "Thumbnail channel", type: "channel", channelTypes: [0] },
          { name: "tour_logo", description: "Tournament logo URL", type: "string" },
          { name: "challonge_tournament", description: "Challonge tournament URL or ID", type: "string" },
          { name: "public_slug", description: "Public board path. Lowercase letters, numbers, hyphen.", type: "string" },
          { name: "public_name", description: "Name shown on the public board", type: "string" },
          { name: "alert_email_1", description: "Emergency email 1. Send - to clear.", type: "string" },
          { name: "alert_email_2", description: "Emergency email 2. Send - to clear.", type: "string" },
          { name: "alert_email_3", description: "Emergency email 3. Send - to clear.", type: "string" },
        ],
      },
      { name: "show", description: "Display current tournament configuration.", key: "config_show", level: "admin" },
    ],
  },
  {
    name: "events",
    description: "Tournament event controls",
    commands: [
      {
        name: "create",
        description: "Create a scheduled match event.",
        key: "events_create",
        level: "admin",
        options: [
          matchOpt("match", "Challonge match id, or Team A vs Team B"),
          { name: "dd", description: "Day", type: "integer", required: true, min: 1, max: 31 },
          { name: "mm", description: "Month", type: "integer", required: true, min: 1, max: 12 },
          { name: "yyyy", description: "Year", type: "integer", required: true, min: 2020, max: 2100 },
          { name: "hour", description: "Hour UTC", type: "integer", required: true, min: 0, max: 23 },
          { name: "minute", description: "Minute UTC", type: "integer", required: true, min: 0, max: 59 },
          { name: "tour_name", description: "Tournament name", type: "string" },
          { name: "group_name", description: "Group", type: "string" },
          { name: "round_no", description: "Round", type: "string" },
          { name: "channel", description: "Target channel", type: "channel", channelTypes: [0] },
          { name: "commander1", description: "Commander 1", type: "user" },
          { name: "commander2", description: "Commander 2", type: "user" },
          { name: "judge", description: "Judge", type: "user" },
          { name: "recorder", description: "Recorder", type: "user" },
          { name: "image_url", description: "Image URL", type: "string" },
          { name: "remarks", description: "Remarks", type: "string" },
        ],
      },
      {
        name: "edit",
        description: "Modify an existing scheduled match event.",
        key: "events_edit",
        level: "admin",
        options: [
          matchOpt("match", "Match id"),
          { name: "dd", description: "Day", type: "integer", min: 1, max: 31 },
          { name: "mm", description: "Month", type: "integer", min: 1, max: 12 },
          { name: "yyyy", description: "Year", type: "integer", min: 2020, max: 2100 },
          { name: "hour", description: "Hour UTC", type: "integer", min: 0, max: 23 },
          { name: "minute", description: "Minute UTC", type: "integer", min: 0, max: 59 },
          { name: "tour_name", description: "Tournament name", type: "string" },
          { name: "group_name", description: "Group", type: "string" },
          { name: "round_no", description: "Round", type: "string" },
          { name: "channel", description: "Target channel", type: "channel", channelTypes: [0] },
          { name: "commander1", description: "Commander 1", type: "user" },
          { name: "commander2", description: "Commander 2", type: "user" },
          { name: "judge", description: "Judge", type: "user" },
          { name: "recorder", description: "Recorder", type: "user" },
          { name: "image_url", description: "Image URL", type: "string" },
          { name: "remarks", description: "Remarks", type: "string" },
        ],
      },
      {
        name: "delete",
        description: "Delete an active scheduled match event.",
        key: "events_delete",
        level: "admin",
        options: [matchOpt("match", "Match id"), { name: "reason", description: "Reason", type: "string" }],
      },
      {
        name: "list",
        description: "List scheduled match packets with optional filters.",
        key: "events_list",
        level: "operator",
        options: [
          { name: "status", description: "Filter by event state", type: "string" },
          { name: "team", description: "Filter by team name fragment", type: "string" },
          { name: "start_utc", description: "Start from YYYY-MM-DD HH:MM UTC", type: "string" },
          { name: "end_utc", description: "Until YYYY-MM-DD HH:MM UTC", type: "string" },
        ],
      },
      { name: "show", description: "Show full schedule packet for a match.", key: "events_show", level: "operator", options: [matchOpt("match", "Match id")] },
      {
        name: "results",
        description: "Submit match result packet to results channel.",
        key: "events_results",
        level: "operator",
        options: [
          matchOpt("event", "Match id"),
          { name: "team1_score", description: "Team 1 score", type: "integer", required: true, min: 0, max: 999 },
          { name: "team2_score", description: "Team 2 score", type: "integer", required: true, min: 0, max: 999 },
          { name: "number_of_matches", description: "Number of matches", type: "integer", min: 1, max: 20 },
          { name: "remarks", description: "Remarks", type: "string" },
          { name: "rec_link", description: "Replay link", type: "string" },
          { name: "screenshot1", description: "Image link 1", type: "string" },
          { name: "screenshot2", description: "Image link 2", type: "string" },
          { name: "screenshot3", description: "Image link 3", type: "string" },
          { name: "screenshot4", description: "Image link 4", type: "string" },
          { name: "screenshot5", description: "Image link 5", type: "string" },
          { name: "screenshot6", description: "Image link 6", type: "string" },
          { name: "screenshot7", description: "Image link 7", type: "string" },
        ],
      },
      {
        name: "staff_resign",
        description: "Clear judge/recorder assignment for an active match.",
        key: "events_staff_resign",
        level: "admin",
        options: [
          matchOpt("match", "Match id"),
          { name: "role", description: "judge or recorder", type: "string", autocomplete: true },
          { name: "reason", description: "Reason", type: "string" },
        ],
      },
      {
        name: "reset_tournament",
        description: "Abort the live event buffer. Type RESET to confirm.",
        key: "events_reset_tournament",
        level: "admin",
        options: [{ name: "confirm", description: "Type RESET to confirm", type: "string" }],
      },
      { name: "status", description: "Show event lifecycle state and readiness.", key: "events_status", level: "operator", options: [matchOpt("match", "Match id")] },
      { name: "checkin_open", description: "Manually open match check-in.", key: "events_checkin_open", level: "admin", options: [matchOpt("match", "Match id")] },
      { name: "checkin_close", description: "Close check-in and move event in-progress.", key: "events_checkin_close", level: "admin", options: [matchOpt("match", "Match id")] },
      {
        name: "ready",
        description: "Mark team readiness for check-in.",
        key: "events_ready",
        level: "admin",
        options: [
          matchOpt("match", "Match id"),
          { name: "side", description: "team1 or team2", type: "string", required: true },
        ],
      },
      {
        name: "abort",
        description: "Abort an event workflow.",
        key: "events_abort",
        level: "supervisor",
        options: [matchOpt("match", "Match id"), { name: "reason", description: "Abort reason", type: "string" }],
      },
      { name: "reopen", description: "Reopen an aborted or archived event.", key: "events_reopen", level: "supervisor", options: [matchOpt("match", "Match id")] },
      {
        name: "verify",
        description: "Mark a match result as verified after review.",
        key: "events_verify",
        level: "supervisor",
        options: [matchOpt("match", "Match id"), { name: "winner", description: "Optional winner name", type: "string" }],
      },
      {
        name: "archive",
        description: "Archive a verified or completed match packet.",
        key: "events_archive",
        level: "supervisor",
        options: [matchOpt("match", "Match id"), { name: "reason", description: "Archive reason", type: "string" }],
      },
      { name: "close", description: "Export match transcript and delete match channel.", key: "events_close", level: "admin", options: [matchOpt("match", "Optional match id", false)] },
      { name: "readiness", description: "View readiness state for active match packets.", key: "events_readiness", level: "admin", options: [matchOpt("match", "Optional match id", false)] },
    ],
  },
  {
    name: "general",
    description: "General administration tools",
    commands: [
      { name: "health", description: "Display bot and tournament subsystem health status.", key: "health", level: "operator" },
      {
        name: "add_to_channel",
        description: "Grant channel access in the active channel.",
        key: "general_add_to_channel",
        level: "admin",
        options: [{ name: "member_role", description: "Member or role to authorize", type: "mentionable", required: true }],
      },
      {
        name: "remove_from_channel",
        description: "Revoke channel access in the active channel.",
        key: "general_remove_from_channel",
        level: "admin",
        options: [{ name: "member_role", description: "Member or role to remove", type: "mentionable", required: true }],
      },
      {
        name: "delete_channel",
        description: "Export transcript and delete the active channel.",
        key: "general_delete_channel",
        level: "admin",
        options: [{ name: "save_transcript", description: "Archive transcript before delete", type: "boolean" }],
      },
      {
        name: "close_channel",
        description: "Close a channel and optionally archive its transcript.",
        key: "general_close_channel",
        level: "admin",
        options: [
          { name: "channel", description: "Target text channel", type: "channel", required: true, channelTypes: [0] },
          { name: "save_transcript", description: "Archive transcript before lock", type: "boolean" },
        ],
      },
    ],
  },
  {
    name: "ticket",
    description: "Ticket operations",
    commands: [
      { name: "panel", description: "Post the public ticket intake control panel.", key: "ticket_panel", level: "admin" },
      { name: "close", description: "Close the active ticket channel.", key: "ticket_close", level: "admin" },
    ],
  },
  {
    name: "challonge",
    description: "Challonge integration controls",
    commands: [
      {
        name: "create",
        description: "Create match channels from the configured Challonge tournament.",
        key: "challonge_create",
        level: "admin",
        options: [{ name: "category", description: "Target category", type: "channel", channelTypes: [4] }],
      },
      {
        name: "set",
        description: "Configure Challonge tournament and optional commander roster.",
        key: "challonge_set",
        level: "admin",
        options: [
          { name: "tournament", description: "Challonge URL or tournament ID", type: "string", required: true },
          { name: "commanders_csv", description: "Optional CSV roster", type: "attachment" },
        ],
      },
      { name: "info", description: "Show active Challonge integration status.", key: "challonge_info", level: "operator" },
      { name: "participants", description: "List challengers in the configured tournament.", key: "challonge_participants", level: "operator" },
      { name: "matches", description: "List the current Challonge match queue.", key: "challonge_matches", level: "operator" },
      { name: "refresh", description: "Refresh Challonge reads.", key: "challonge_refresh", level: "admin" },
    ],
  },
  {
    name: "participants",
    description: "Tournament participant registry controls",
    commands: [
      {
        name: "upload",
        description: "Upload or replace team rosters from a CSV packet.",
        key: "participants_upload",
        level: "admin",
        options: [{ name: "roster_file", description: "CSV roster file", type: "attachment", required: true }],
      },
      {
        name: "ban",
        description: "Block a game identifier from tournament registry operations.",
        key: "participants_ban",
        level: "admin",
        options: [
          { name: "game_id", description: "Game identifier", type: "string", required: true },
          { name: "reason", description: "Ban reason", type: "string", required: true },
        ],
      },
      {
        name: "check_ban",
        description: "Check if a game identifier is blocked.",
        key: "participants_check_ban",
        level: "admin",
        options: [{ name: "game_id", description: "Game identifier to check", type: "string", required: true }],
      },
      {
        name: "info",
        description: "Post registered team rosters to the participants channel.",
        key: "participants_info",
        level: "admin",
        options: [{ name: "team_name", description: "Optional team name filter", type: "string" }],
      },
      {
        name: "lookup",
        description: "Find a unit by game identifier.",
        key: "participants_lookup",
        level: "admin",
        options: [{ name: "game_id", description: "Commander or member game identifier", type: "string", required: true }],
      },
      {
        name: "show",
        description: "Show a single team roster by team name.",
        key: "participants_show",
        level: "admin",
        options: [{ name: "team_name", description: "Team name to display", type: "string", required: true }],
      },
      { name: "sync_roles", description: "Synchronize commander role for registered commanders.", key: "participants_sync_roles", level: "admin" },
      {
        name: "history",
        description: "View participant registry audit events.",
        key: "participants_history",
        level: "admin",
        options: [
          { name: "action", description: "Filter by action", type: "string" },
          { name: "limit", description: "Maximum entries", type: "integer", min: 1, max: 80 },
        ],
      },
    ],
  },
  {
    name: "stats",
    description: "Operational tournament analytics",
    commands: [
      { name: "overview", description: "Display tournament operational metrics.", key: "stats_overview", level: "operator" },
      { name: "persistence", description: "Display persistence and recovery checkpoint information.", key: "stats_persistence", level: "operator" },
      { name: "match", description: "Get a detailed packet for a single match.", key: "stats_match", level: "operator", options: [matchOpt("match_id", "Match id")] },
      { name: "tournament", description: "Display tournament telemetry.", key: "stats_tournament", level: "operator" },
      { name: "matches", description: "List match packets with live status.", key: "stats_matches", level: "operator" },
      { name: "participants", description: "Inspect team roster coverage.", key: "stats_participants", level: "operator" },
      { name: "progress", description: "Show tournament progress and recovery posture.", key: "stats_progress", level: "operator" },
    ],
  },
  {
    name: "audit",
    description: "Audit and compliance tooling",
    commands: [
      {
        name: "list",
        description: "Inspect recent audit events.",
        key: "audit_list",
        level: "admin",
        options: [
          { name: "limit", description: "Maximum records", type: "integer", min: 1, max: 40 },
          { name: "action", description: "Action filter", type: "string" },
          { name: "actor_id", description: "Actor Discord id", type: "string" },
        ],
      },
      {
        name: "export",
        description: "Export audit events.",
        key: "audit_export",
        level: "admin",
        options: [
          { name: "limit", description: "Maximum rows", type: "integer", min: 1, max: 200 },
          { name: "action", description: "Action filter", type: "string" },
          { name: "file_name", description: "Optional filename", type: "string" },
        ],
      },
    ],
  },
  {
    name: "appeal",
    description: "Dispute and review channel workflow",
    commands: [
      {
        name: "create",
        description: "Create an appeal packet for match disputes.",
        key: "appeal_create",
        level: "organizer",
        options: [
          { name: "match_id", description: "Match identifier", type: "string", required: true },
          { name: "team", description: "Affected team name", type: "string", required: true },
          { name: "reason", description: "Dispute summary", type: "string", required: true },
          { name: "evidence1", description: "Evidence file", type: "attachment" },
          { name: "evidence2", description: "Evidence file", type: "attachment" },
          { name: "evidence3", description: "Evidence file", type: "attachment" },
        ],
      },
      { name: "status", description: "Show a dispute packet.", key: "appeal_status", level: "organizer", options: [{ name: "appeal_id", description: "Appeal identifier", type: "string", required: true }] },
      {
        name: "review",
        description: "Move an appeal to review state.",
        key: "appeal_review",
        level: "organizer",
        options: [
          { name: "appeal_id", description: "Appeal identifier", type: "string", required: true },
          { name: "notes", description: "Review notes", type: "string", required: true },
        ],
      },
      {
        name: "decide",
        description: "Decision command for active appeals.",
        key: "appeal_decide",
        level: "supervisor",
        options: [
          { name: "appeal_id", description: "Appeal identifier", type: "string", required: true },
          { name: "reason", description: "Decision reason", type: "string" },
          { name: "winner", description: "Winning team", type: "string" },
          { name: "close", description: "Close when finalizing", type: "boolean" },
        ],
      },
      {
        name: "close",
        description: "Close an active appeal packet.",
        key: "appeal_close",
        level: "supervisor",
        options: [
          { name: "appeal_id", description: "Appeal identifier", type: "string", required: true },
          { name: "reason", description: "Closure reason", type: "string" },
        ],
      },
    ],
  },
  {
    name: "maintenance",
    description: "Operational maintenance and recovery tooling",
    commands: [
      { name: "snapshot", description: "Create a durable tournament snapshot.", key: "maintenance_snapshot", level: "admin", options: [{ name: "label", description: "Optional snapshot label", type: "string" }] },
      {
        name: "restore",
        description: "Restore tournament state. Type RESTORE to confirm.",
        key: "maintenance_restore",
        level: "admin",
        options: [
          { name: "confirm", description: "Type RESTORE to confirm", type: "string", required: true },
          { name: "snapshot_id", description: "Optional snapshot id", type: "string" },
        ],
      },
    ],
  },
  {
    name: "random",
    description: "Randomized utility commands",
    commands: [
      {
        name: "time",
        description: "Select a random UTC time slot in 30-minute increments.",
        key: "random_time",
        level: "operator",
        options: [
          { name: "start", description: "Window start HH:MM UTC", type: "string", required: true },
          { name: "end", description: "Window end HH:MM UTC", type: "string", required: true },
        ],
      },
      {
        name: "maps",
        description: "Select random maps from the mission atlas.",
        key: "random_maps",
        level: "operator",
        options: [
          { name: "count", description: "Number of maps to draw", type: "integer", required: true, min: 1, max: 30 },
          { name: "include_mini", description: "Include mini map variants", type: "boolean" },
        ],
      },
    ],
  },
];

export const rootCommands: CommandSpec[] = [
  { name: "generate_bracket", description: "Generate a bracket summary from Challonge match data.", key: "generate_bracket", level: "admin" },
  {
    name: "report_result",
    description: "Submit match result with optional image proof.",
    key: "report_result",
    level: "operator",
    options: [
      { name: "match_id", description: "Match id", type: "integer", required: true, min: 1, max: 10000000 },
      { name: "team_a_score", description: "Score for team A", type: "integer", required: true, min: 0, max: 999 },
      { name: "team_b_score", description: "Score for team B", type: "integer", required: true, min: 0, max: 999 },
      { name: "proof_image", description: "Optional image proof", type: "attachment" },
      { name: "notes", description: "Optional notes", type: "string" },
    ],
  },
  {
    name: "force_win",
    description: "Force a winner for a match.",
    key: "force_win",
    level: "supervisor",
    options: [
      { name: "match_id", description: "Match id", type: "integer", required: true, min: 1, max: 10000000 },
      { name: "winner_team", description: "Winner team name", type: "string", required: true },
      { name: "score_csv", description: "Score in A-B format", type: "string", required: true },
    ],
  },
  {
    name: "disqualify",
    description: "Disqualify a team from active events.",
    key: "disqualify",
    level: "supervisor",
    options: [
      { name: "team_name", description: "Team name to disqualify", type: "string", required: true },
      { name: "reason", description: "Disqualification reason", type: "string", required: true },
      { name: "match_id", description: "Optional match id", type: "integer", min: 1, max: 10000000 },
    ],
  },
  { name: "toss", description: "Launch a randomized command coin toss.", key: "toss", level: "operator" },
  { name: "sync", description: "Synchronize command trees for managed guilds.", key: "sync", level: "admin" },
];

export function commandCount(): number {
  return rootCommands.length + groups.reduce((sum, group) => sum + group.commands.length, 0);
}

export function findCommand(commandName: string, sub: string | null): CommandSpec | undefined {
  if (!sub) return rootCommands.find((command) => command.name === commandName);
  return groups.find((group) => group.name === commandName)?.commands.find((command) => command.name === sub);
}

export function listCommands(): { group: string; command: CommandSpec }[] {
  const rows = groups.flatMap((group) => group.commands.map((command) => ({ group: group.name, command })));
  return [...rows, ...rootCommands.map((command) => ({ group: "", command }))];
}

const OPTION_TYPE: Record<OptType, number> = {
  string: 3,
  integer: 4,
  boolean: 5,
  user: 6,
  channel: 7,
  role: 8,
  mentionable: 9,
  attachment: 11,
};

function optionJson(opt: OptSpec) {
  const body: Record<string, unknown> = {
    name: opt.name,
    description: opt.description,
    type: OPTION_TYPE[opt.type],
    required: Boolean(opt.required),
  };
  if (opt.autocomplete) body.autocomplete = true;
  if (opt.channelTypes) body.channel_types = opt.channelTypes;
  if (opt.type === "integer") {
    if (opt.min != null) body.min_value = opt.min;
    if (opt.max != null) body.max_value = opt.max;
  }
  if (opt.type === "string") {
    if (opt.min != null) body.min_length = opt.min;
    if (opt.max != null) body.max_length = opt.max;
  }
  return body;
}

function orderedOptions(options: OptSpec[] | undefined) {
  const list = options ?? [];
  return [...list.filter((opt) => opt.required), ...list.filter((opt) => !opt.required)].map(optionJson);
}

function commandBody(command: CommandSpec) {
  const options = orderedOptions(command.options);
  return {
    type: 1,
    name: command.name,
    description: command.description,
    ...(options.length ? { options } : {}),
  };
}

export function discordCommandPayload() {
  const grouped = groups.map((group) => ({
    name: group.name,
    description: group.description,
    dm_permission: false,
    options: group.commands.map((command) => {
      const options = orderedOptions(command.options);
      return {
        type: 1,
        name: command.name,
        description: command.description,
        ...(options.length ? { options } : {}),
      };
    }),
  }));
  const roots = rootCommands.map((command) => ({
    ...commandBody(command),
    dm_permission: false,
  }));
  return [...grouped, ...roots];
}
