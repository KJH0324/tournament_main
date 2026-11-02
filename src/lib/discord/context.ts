import { findCommand } from "./catalog";
import type { AttachmentRef, CommandContext, Person } from "./protocol";

export type RawOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
  focused?: boolean;
  options?: RawOption[];
};

export type RawInteraction = {
  type: number;
  guild_id?: string;
  channel_id?: string;
  member?: { roles?: string[]; permissions?: string; user?: { id: string; username: string; global_name?: string } };
  user?: { id: string; username: string; global_name?: string };
  data?: {
    name?: string;
    custom_id?: string;
    options?: RawOption[];
    resolved?: {
      users?: Record<string, { id: string; username: string; global_name?: string }>;
      roles?: Record<string, { id: string; name: string }>;
      channels?: Record<string, { id: string; name: string }>;
      attachments?: Record<string, { id: string; filename: string; size: number; url: string; content_type?: string }>;
    };
  };
};

type Bag = {
  key: string;
  guildId: string | null;
  channelId: string | null;
  userId: string;
  username: string;
  permissions: bigint;
  roleIds: string[];
  focused: string | null;
  values: Record<string, string | number | boolean>;
  users: Record<string, Person>;
  channels: Record<string, Person>;
  roles: Record<string, Person>;
  attachments: Record<string, AttachmentRef>;
};

export function makeContext(input: Bag): CommandContext {
  return {
    key: input.key,
    guildId: input.guildId,
    channelId: input.channelId,
    userId: input.userId,
    username: input.username,
    permissions: input.permissions,
    roleIds: input.roleIds,
    focused: input.focused,
    get: (name) => input.values[name] ?? null,
    str: (name) => {
      const value = input.values[name];
      return value == null ? "" : String(value);
    },
    int: (name) => {
      const value = input.values[name];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
      return null;
    },
    bool: (name) => (typeof input.values[name] === "boolean" ? (input.values[name] as boolean) : null),
    user: (name) => input.users[name] ?? null,
    channel: (name) => input.channels[name] ?? null,
    role: (name) => input.roles[name] ?? null,
    mention: (name) => {
      if (input.users[name]) return { id: input.users[name].id, kind: "user", name: input.users[name].name };
      if (input.roles[name]) return { id: input.roles[name].id, kind: "role", name: input.roles[name].name };
      return null;
    },
    attachment: (name) => input.attachments[name] ?? null,
    query: () => {
      if (!input.focused) return "";
      const value = input.values[input.focused];
      return value == null ? "" : String(value);
    },
  };
}

type InteractionData = NonNullable<RawInteraction["data"]>;

function walk(options: RawOption[] | undefined, bag: Bag, resolved: InteractionData["resolved"]) {
  for (const opt of options ?? []) {
    if (opt.type === 1 || opt.type === 2) {
      walk(opt.options, bag, resolved);
      continue;
    }
    if (opt.focused) bag.focused = opt.name;
    if (opt.value != null) bag.values[opt.name] = opt.value;
    const id = typeof opt.value === "string" ? opt.value : "";
    if (opt.type === 6 && id && resolved?.users?.[id]) {
      const user = resolved.users[id];
      bag.users[opt.name] = { id, name: user.global_name || user.username };
    }
    if (opt.type === 8 && id && resolved?.roles?.[id]) {
      bag.roles[opt.name] = { id, name: resolved.roles[id].name };
    }
    if (opt.type === 7 && id && resolved?.channels?.[id]) {
      bag.channels[opt.name] = { id, name: resolved.channels[id].name };
    }
    if (opt.type === 9 && id) {
      if (resolved?.users?.[id]) bag.users[opt.name] = { id, name: resolved.users[id].global_name || resolved.users[id].username };
      if (resolved?.roles?.[id]) bag.roles[opt.name] = { id, name: resolved.roles[id].name };
    }
    if (opt.type === 11 && id && resolved?.attachments?.[id]) {
      const file = resolved.attachments[id];
      bag.attachments[opt.name] = {
        url: file.url,
        filename: file.filename,
        size: file.size,
        contentType: file.content_type ?? "",
      };
    }
  }
}

export function contextFromRaw(body: RawInteraction): CommandContext {
  const commandName = body.data?.name ?? "";
  const sub = body.data?.options?.find((opt) => opt.type === 1 || opt.type === 2) ?? null;
  const spec = findCommand(commandName, sub?.name ?? null);
  const key = spec?.key ?? (sub ? `${commandName}_${sub.name}` : commandName || "component");
  const user = body.member?.user ?? body.user;
  const bag: Bag = {
    key,
    guildId: body.guild_id ?? null,
    channelId: body.channel_id ?? null,
    userId: user?.id ?? "",
    username: user?.global_name || user?.username || "unit",
    permissions: BigInt(body.member?.permissions ?? "0"),
    roleIds: body.member?.roles ?? [],
    focused: null,
    values: {},
    users: {},
    channels: {},
    roles: {},
    attachments: {},
  };
  walk(body.data?.options, bag, body.data?.resolved);
  return makeContext(bag);
}

export function componentContext(body: RawInteraction): CommandContext {
  const ctx = contextFromRaw({ ...body, data: { ...body.data, name: "component" } });
  return { ...ctx, key: body.data?.custom_id ?? "component" };
}
