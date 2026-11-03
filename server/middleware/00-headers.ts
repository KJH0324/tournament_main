export default async function securityHeaders(
  event: { req: { headers: Headers } },
  next: () => Promise<unknown> | unknown,
) {
  const result = await next();
  if (!(result instanceof Response)) return result;
  const headers = new Headers(result.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  const host = event.req.headers.get("x-forwarded-host") ?? event.req.headers.get("host") ?? "";
  if (host.startsWith("admin.")) headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  return new Response(result.body, { status: result.status, statusText: result.statusText, headers });
}
