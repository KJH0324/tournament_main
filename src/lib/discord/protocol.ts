export const TOURNAMENT_GUILD_ID = process.env.DISCORD_TOURNAMENT_GUILD_ID?.trim() || "1194868040895049728";

export const INTAKE_CHANNELS = {
  bug: "1457245461642739838",
  report: "1457301492334727304",
  emergency: "1457301552870981722",
} as const;

export function guildIds(): string[] {
  const raw = process.env.DISCORD_GUILD_IDS?.trim();
  const ids = raw
    ? raw.split(",").map((part) => part.trim()).filter(Boolean)
    : ["1457245460799553620", TOURNAMENT_GUILD_ID];
  return [...new Set(ids)];
}

export function clean(value: string, max = 240): string {
  return value
    .replace(/@everyone|@here/gi, "")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function httpUrl(value: string): string {
  const safe = clean(value, 300);
  try {
    const url = new URL(safe);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return "";
  }
  return "";
}

export const MAP_POOL = [
  "Hazbari island",
  "Hazbari island (Dawn)",
  "Lorica",
  "Quarry",
  "Golden Resort",
  "Eastern Province",
  "Blizzard Assault",
  "Crossfire City",
  "Old Factory",
  "Breaker Bay",
  "Ice World",
  "Arid Frontier",
  "Gyeong Province",
  "Fire Storm",
  "Blizzard Assault Mini",
  "Golden Resort Mini",
];

export function mapPool(includeMini: boolean): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of MAP_POOL) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (!includeMini && key.includes("mini")) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export const TRANSITIONS: Record<string, string[]> = {
  scheduled: ["checkin_open", "aborted"],
  checkin_open: ["in_progress", "aborted"],
  in_progress: ["result_submitted", "aborted", "archived"],
  result_submitted: ["verified", "archived", "aborted"],
  verified: ["archived", "aborted"],
  archived: ["scheduled"],
  aborted: ["scheduled"],
};

export function boardStatus(state: string): "open" | "live" | "done" {
  if (state === "verified" || state === "archived") return "done";
  if (state === "in_progress" || state === "result_submitted") return "live";
  return "open";
}

export type Tone = "success" | "error" | "alert" | "warning";

export type Field = { name: string; value: string; inline?: boolean };
export type ButtonSpec = { id: string; label: string; style?: number };

export type Reply = {
  tone: Tone;
  description: string;
  title?: string;
  fields?: Field[];
  ephemeral?: boolean;
  buttons?: ButtonSpec[];
  fileText?: string;
  sideEffect?: () => Promise<void>;
};

const COLORS: Record<Tone, number> = {
  success: 0x00ff41,
  error: 0xff0000,
  warning: 0xffd400,
  alert: 0x2f7bff,
};

export function stripStatusTag(value: string): string {
  return value.replace(/^\[(?:SUCCESS|ERROR|ALERT|WARNING)\]\s*/i, "").trim();
}

export function reply(tone: Tone, description: string, extra: Partial<Reply> = {}): Reply {
  return { tone, description: clean(description, 1800) || "Empty payload.", ...extra };
}

export function ok(description: string, extra: Partial<Reply> = {}): Reply {
  return reply("success", description, extra);
}

export function fail(description: string, ephemeral = true): Reply {
  return reply("error", description, { ephemeral });
}

export function warn(description: string, ephemeral = true): Reply {
  return reply("warning", description, { ephemeral });
}

export function alert(description: string, extra: Partial<Reply> = {}): Reply {
  return reply("alert", description, extra);
}

export function replyPayload(message: Reply) {
  const fields = (message.fields ?? []).slice(0, 24).map((field) => ({
    name: clean(field.name, 80) || "Field",
    value: clean(field.value, 900) || "—",
    inline: Boolean(field.inline),
  }));
  if (message.fileText) {
    fields.push({
      name: "Packet",
      value: `\`\`\`\n${message.fileText.slice(0, 700)}\n\`\`\``,
      inline: false,
    });
  }
  const title = stripStatusTag(message.title ?? "");
  const description = stripStatusTag(message.description) || "Empty payload.";
  const data: Record<string, unknown> = {
    embeds: [
      {
        ...(title ? { title } : {}),
        description,
        color: COLORS[message.tone],
        fields,
        footer: { text: "KJH Bot" },
      },
    ],
  };
  if (message.ephemeral) data.flags = 64;
  if (message.buttons?.length) {
    data.components = [
      {
        type: 1,
        components: message.buttons.slice(0, 5).map((button) => ({
          type: 2,
          style: button.style ?? 2,
          label: clean(button.label, 80),
          custom_id: button.id.slice(0, 100),
        })),
      },
    ];
  }
  return data;
}

export type Person = { id: string; name: string };
export type AttachmentRef = { url: string; filename: string; size: number; contentType: string };

export type CommandContext = {
  key: string;
  guildId: string | null;
  channelId: string | null;
  userId: string;
  username: string;
  permissions: bigint;
  roleIds: string[];
  focused: string | null;
  get(name: string): string | number | boolean | null;
  str(name: string): string;
  int(name: string): number | null;
  bool(name: string): boolean | null;
  user(name: string): Person | null;
  channel(name: string): Person | null;
  role(name: string): Person | null;
  mention(name: string): { id: string; kind: "user" | "role"; name: string } | null;
  attachment(name: string): AttachmentRef | null;
  query(): string;
};

const ADMIN = 8n;

export function isAdministrator(ctx: CommandContext): boolean {
  return (ctx.permissions & ADMIN) === ADMIN;
}
