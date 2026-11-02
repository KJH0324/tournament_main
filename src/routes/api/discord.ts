import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/discord")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleDiscordRequest } = await import("@/lib/discord/http");
        return handleDiscordRequest(request);
      },
    },
  },
});
