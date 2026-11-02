import { webcrypto } from "node:crypto";
import { autocomplete, dispatch, onComponent } from "./dispatch";
import { componentContext, contextFromRaw, type RawInteraction } from "./context";
import { fail, replyPayload } from "./protocol";

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function signed(publicKey: string, signature: string, timestamp: string, raw: string): Promise<boolean> {
  const keyBytes = hexToBytes(publicKey);
  const sigBytes = hexToBytes(signature);
  if (!keyBytes || !sigBytes || keyBytes.length !== 32) return false;
  const key = await webcrypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
  const message = new TextEncoder().encode(timestamp + raw);
  return webcrypto.subtle.verify("Ed25519", key, sigBytes, message);
}

export async function handleDiscordRequest(request: Request): Promise<Response> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim() ?? "";
  if (!publicKey) return new Response("DISCORD_PUBLIC_KEY missing", { status: 401 });
  const signature = request.headers.get("x-signature-ed25519") ?? "";
  const timestamp = request.headers.get("x-signature-timestamp") ?? "";
  const raw = await request.text();
  const fresh = Number(timestamp);
  if (!Number.isFinite(fresh) || Math.abs(Date.now() / 1000 - fresh) > 300) {
    return new Response("stale signature", { status: 401 });
  }
  if (!(await signed(publicKey, signature, timestamp, raw))) {
    return new Response("bad signature", { status: 401 });
  }
  let body: RawInteraction;
  try {
    body = JSON.parse(raw) as RawInteraction;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (body.type === 1) return Response.json({ type: 1 });
  try {
    if (body.type === 4) {
      const choices = await autocomplete(contextFromRaw(body));
      return Response.json({ type: 8, data: { choices: choices.slice(0, 25) } });
    }
    if (body.type === 3) {
      const message = await onComponent(body.data?.custom_id ?? "", componentContext(body));
      return Response.json({ type: 4, data: replyPayload(message) });
    }
    if (body.type === 2) {
      const message = await dispatch(contextFromRaw(body));
      const effect = message.sideEffect;
      const response = Response.json({ type: 4, data: replyPayload(message) });
      if (effect) void effect().catch(() => undefined);
      return response;
    }
  } catch (err) {
    console.error("[discord] http", err instanceof Error ? err.message : "error");
    return Response.json({ type: 4, data: replyPayload(fail("[ERROR] Command failed.")) });
  }
  return Response.json({ type: 4, data: replyPayload(fail("[ERROR] Unsupported interaction.")) });
}
