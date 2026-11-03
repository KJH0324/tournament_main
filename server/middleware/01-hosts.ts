const APEX = "https://raven-tournament.xyz";
const PUBLIC_PATHS = new Set([
  "/commands",
  "/results",
  "/support",
  "/terms",
  "/privacy",
  "/schedule",
  "/desk",
  "/tools",
]);

interface HostEvent {
  url: URL;
  req: { headers: Headers };
}

function hostName(raw: string): string {
  return raw.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

function inviteLocation(): string | null {
  const id = process.env.DISCORD_APPLICATION_ID?.trim() ?? "";
  if (!/^\d{17,20}$/.test(id)) return null;
  const params = new URLSearchParams({
    client_id: id,
    permissions: "8",
    scope: "bot applications.commands",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export default function hosts(event: HostEvent, next: () => Promise<unknown> | unknown) {
  const name = hostName(event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? event.url.host);
  if (name.startsWith("invite.")) {
    const to = inviteLocation();
    if (!to) return new Response("초대 링크를 만들 수 없습니다.", { status: 503 });
    return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store" } });
  }
  if (name.startsWith("admin.")) {
    const path = event.url.pathname.length > 1 ? event.url.pathname.replace(/\/$/, "") : "/";
    if (PUBLIC_PATHS.has(path)) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${APEX}${path}${event.url.search}`, "Cache-Control": "no-store" },
      });
    }
  }
  return next();
}
