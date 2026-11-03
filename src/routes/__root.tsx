import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: async () => {
    try {
      const { getBotPresence } = await import("@/lib/discord/presence");
      return await getBotPresence();
    } catch {
      return { phase: "offline" as const, user: "" };
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "레이븐 토너먼트" },
      { name: "description", content: "레이븐 토너먼트 디스코드 봇과 운영 보드." },
      { name: "theme-color", content: "#08111f" },
      { property: "og:title", content: "레이븐 토너먼트" },
      { property: "og:description", content: "레이븐 토너먼트 디스코드 봇과 운영 보드." },
      { property: "og:image", content: "/og.jpg" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
