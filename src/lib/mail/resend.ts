export type MailResult = "sent" | "no_recipient" | "no_key" | "failed";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeAlertEmail(value: string): string | null {
  const next = value.trim().toLowerCase();
  if (next === "-" || next === "none") return "";
  if (!EMAIL_RE.test(next) || next.length > 120) return null;
  return next;
}

export function maskEmail(email: string): string {
  const [name, host] = email.split("@");
  if (!name || !host) return "설정됨";
  return `${name.slice(0, 1)}***@${host}`;
}

export function alertRecipients(slots: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slot of slots) {
    const email = slot.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export async function sendEmergency(input: {
  to: string[];
  serverName: string;
  source: string;
  handle: string;
  body: string;
}): Promise<MailResult> {
  const to = alertRecipients(input.to);
  if (!to.length) return "no_recipient";
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return "no_key";
  const from = process.env.RESEND_FROM?.trim() || "레이븐 토너먼트 <alerts@raven-tournament.xyz>";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `[비상] ${input.serverName}`.slice(0, 120),
        text: [`${input.serverName}`, `경로: ${input.source}`, `호출: ${input.handle}`, "", input.body].join("\n").slice(0, 4000),
      }),
    });
    if (!response.ok) {
      console.error("[resend]", response.status);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[resend]", err instanceof Error ? err.message : "fetch failed");
    return "failed";
  }
}
