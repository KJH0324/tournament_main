import type { ReactNode } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

const links = [
  { to: "/", label: "서버", exact: true },
  { to: "/results", label: "결과", exact: false },
  { to: "/commands", label: "명령", exact: false },
  { to: "/support", label: "문의", exact: false },
  { to: "/admin", label: "관리", exact: false },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="mc-mark">MC</span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">Mission Control</span>
              <span className="block text-sm text-muted">레이븐 토너먼트</span>
            </span>
          </Link>
          <nav className="mc-nav-scroll flex flex-1 gap-2 overflow-x-auto">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="mc-nav"
                activeOptions={{ exact: link.exact }}
                activeProps={{ className: "is-active" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <BotState />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted md:flex-row md:justify-between">
          <p>레이븐 토너먼트</p>
        </div>
      </footer>
    </div>
  );
}

function BotState() {
  const data = useLoaderData({ from: "__root__" }) as { phase?: string } | undefined;
  const phase = data?.phase;
  const online = phase === "online";
  const label = online ? "봇 온라인" : phase === "connecting" ? "봇 접속 중" : "봇 오프라인";
  return <Pill tone={online ? "brass" : "muted"}>{label}</Pill>;
}

export function PageHead({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-2xl">
      {kicker ? <p className="text-sm font-semibold tracking-wide text-accent">{kicker}</p> : null}
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {children ? <p className="mt-3 text-muted">{children}</p> : null}
    </header>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "brass";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-bold",
        tone === "brass"
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-line bg-surface-2 text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-danger">{children}</p>;
}
