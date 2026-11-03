import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute("/api/discord")({
  server: {
    handlers: {
      GET: () => new Response(null, { status: 405, headers: { allow: "POST" } }),
      POST: async ({ request }) => {
        const { handleDiscordRequest } = await import("@/lib/discord/http");
        return handleDiscordRequest(request);
      },
    },
  },
});
