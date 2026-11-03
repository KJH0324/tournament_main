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
      { title: "KJH Bot" },
      { name: "description", content: "레이븐 토너먼트 봇." },
      { name: "theme-color", content: "#0b0b0c" },
      { property: "og:title", content: "KJH Bot" },
      { property: "og:description", content: "레이븐 토너먼트 봇." },
      { property: "og:image", content: "/og.jpg" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", href: "/brand/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/brand/favicon-32.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/brand/favicon-192.png" },
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
