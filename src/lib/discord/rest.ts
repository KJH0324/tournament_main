export function botToken(): string {
  return process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
}

export function challongeKey(): string {
  return process.env.CHALLONGE_API_KEY?.trim() ?? "";
}

export async function discordApi(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = botToken();
  if (!token) throw new Error("DISCORD_BOT_TOKEN missing");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bot ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`https://discord.com/api/v10${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Discord ${response.status}`);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function applicationId(): Promise<string> {
  const configured = process.env.DISCORD_APPLICATION_ID?.trim();
  if (configured) return configured;
  const me = (await discordApi("/users/@me")) as { id?: string };
  if (!me.id) throw new Error("application id missing");
  return me.id;
}

export async function sendEmbed(channelId: string, description: string, title = "[ALERT] System Notice"): Promise<void> {
  if (!channelId || !botToken()) return;
  await discordApi(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      embeds: [{ title, description: description.slice(0, 1800), color: 0x2f7bff }],
      allowed_mentions: { parse: [] },
    }),
  });
}

export async function createTextChannel(guildId: string, name: string, parentId?: string): Promise<string> {
  const body: Record<string, unknown> = { name: name.slice(0, 90), type: 0 };
  if (parentId) body.parent_id = parentId;
  const created = (await discordApi(`/guilds/${guildId}/channels`, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { id?: string };
  return created.id ?? "";
}

export async function deleteChannel(channelId: string): Promise<void> {
  await discordApi(`/channels/${channelId}`, { method: "DELETE" });
}

export async function putOverwrite(
  channelId: string,
  targetId: string,
  kind: "user" | "role",
  allow: string,
  deny: string,
): Promise<void> {
  await discordApi(`/channels/${channelId}/permissions/${targetId}`, {
    method: "PUT",
    body: JSON.stringify({ type: kind === "role" ? 0 : 1, allow, deny }),
  });
}

export async function deleteOverwrite(channelId: string, targetId: string): Promise<void> {
  await discordApi(`/channels/${channelId}/permissions/${targetId}`, { method: "DELETE" });
}

export async function transcript(channelId: string): Promise<string> {
  const messages = (await discordApi(`/channels/${channelId}/messages?limit=30`)) as {
    author?: { username?: string };
    content?: string;
  }[];
  if (!Array.isArray(messages)) return "";
  return messages
    .reverse()
    .map((message) => `${message.author?.username ?? "unit"}: ${(message.content ?? "").slice(0, 180)}`)
    .join("\n")
    .slice(0, 1600);
}

export async function addRole(guildId: string, userId: string, roleId: string): Promise<void> {
  await discordApi(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, { method: "PUT" });
}

export function tournamentSlug(raw: string): string {
  const match = raw.match(/challonge\.com\/(?:[^/]+\/)?([^/?#]+)/i);
  return (match?.[1] || raw).replace(/\.json$/i, "").trim();
}

export async function challonge(path: string): Promise<unknown> {
  const key = challongeKey();
  if (!key) throw new Error("CHALLONGE_API_KEY missing");
  const joiner = path.includes("?") ? "&" : "?";
  const response = await fetch(`https://api.challonge.com/v1${path}${joiner}api_key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Challonge ${response.status}`);
  return response.json();
}
