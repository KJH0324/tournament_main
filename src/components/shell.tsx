import type { ReactNode } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

const links = [
  { to: "/", label: "홈", exact: true },
  { to: "/commands", label: "슬래시 명령어", exact: false },
  { to: "/results", label: "결과", exact: false },
  { to: "/support", label: "문의", exact: false },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-fg">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <img src="/brand/mark-white-on-navy.png" alt="" width={36} height={36} className="h-9 w-9 rounded-md" />
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">KJH Bot</span>
              <span className="block text-sm text-muted">레이븐 토너먼트</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-2">
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
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">KJH Bot</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-muted">
            <Link to="/terms">이용약관</Link>
            <Link to="/privacy">개인정보 처리방침</Link>
          </nav>
          <p className="text-muted">raven-tournament.xyz</p>
        </div>
      </footer>
    </div>
  );
}

function BotState() {
  const data = useLoaderData({ from: "__root__" }) as { phase?: string } | undefined;
  const phase = data?.phase;
  const online = phase === "online";
  const label = online ? "온라인" : phase === "connecting" ? "접속 중" : "오프라인";
  return <Pill tone={online ? "brass" : "muted"}>{label}</Pill>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell min-h-screen text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="https://admin.raven-tournament.xyz/" className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <img src="/brand/mark-black-transparent.png" alt="" width={28} height={28} className="h-7 w-7" />
            관리자
          </a>
          <a href="https://raven-tournament.xyz/" className="text-sm text-muted">
            사이트로
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
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
