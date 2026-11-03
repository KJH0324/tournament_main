import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { getAdminSession, listAdminAccounts } from "@/lib/admin/gate";
import { getSurface, listServers, type ServerCard } from "@/lib/guilds/board";
import { CommandList } from "@/components/command-list";
import { manualGroups } from "@/lib/discord/manual";
import { listInbox } from "@/lib/raven/api";
import { TicketInbox } from "@/components/ticket-inbox";
import { AdminAccounts } from "@/components/admin-accounts";
import { AdminLogin, AdminLogout } from "@/components/admin-login";
import { AdminShell, Pill, Shell } from "@/components/shell";

export const Route = createFileRoute("/")({
  loader: async () => {
    const surface = await getSurface();
    const groups = manualGroups();
    if (!surface.admin) {
      const directory = await listServers();
      return { admin: false as const, servers: directory.servers, groups };
    }
    const session = await getAdminSession();
    if (!session.authed) return { admin: true as const, authed: false as const, groups };
    const directory = await listServers();
    const accounts = session.main ? await listAdminAccounts() : { accounts: [] };
    const tickets = await listInbox({ data: {} });
    return {
      admin: true as const,
      authed: true as const,
      main: session.main,
      servers: directory.servers,
      accounts: accounts.accounts,
      tickets,
      groups,
    };
  },
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  if (data.admin && !data.authed) return <AdminLogin next="/" />;
  if (data.admin && data.authed) {
    const open = data.tickets.filter((ticket) => ticket.status === "open").length;
    return (
      <AdminShell>
        <h1 className="text-3xl font-bold">관리자</h1>
        <AdminLogout />
        <BotLine />
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="mc-panel p-4">
            <dt className="text-xs text-muted">서버</dt>
            <dd className="mt-1 text-3xl font-bold">{data.servers.length}</dd>
          </div>
          <div className="mc-panel p-4">
            <dt className="text-xs text-muted">열린 문의</dt>
            <dd className="mt-1 text-3xl font-bold">{open}</dd>
          </div>
          <div className="mc-panel p-4">
            <dt className="text-xs text-muted">접수</dt>
            <dd className="mt-1 text-3xl font-bold">{data.tickets.length}</dd>
          </div>
        </dl>
        {data.main ? <AdminAccounts accounts={data.accounts} /> : null}
        <TicketInbox tickets={data.tickets} />
        <h2 className="mt-8 text-lg font-semibold">서버</h2>
        <ServerList servers={data.servers} />
      </AdminShell>
    );
  }
  return (
    <Shell>
      <h1 className="text-3xl font-bold">KJH Bot</h1>
      <p className="mt-1 text-sm text-muted">레이븐 토너먼트</p>
      <ServerList servers={data.servers} />
      <section id="commands" className="mt-10">
        <h2 className="text-2xl font-bold">슬래시 명령어</h2>
        <div className="mt-4">
          <CommandList groups={data.groups} />
        </div>
      </section>
    </Shell>
  );
}

function BotLine() {
  const root = useLoaderData({ from: "__root__" }) as { phase?: string } | undefined;
  const phase = root?.phase;
  const label = phase === "online" ? "온라인" : phase === "connecting" ? "접속 중" : "오프라인";
  return <p className="mt-2 text-sm text-muted">봇 {label}</p>;
}

function ServerList({ servers }: { servers: ServerCard[] }) {
  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {servers.length === 0 ? <li className="py-4 text-sm text-muted">등록된 서버가 없습니다.</li> : null}
      {servers.map((server) => (
        <li key={server.slug}>
          <Link
            to="/s/$slug"
            params={{ slug: server.slug }}
            className="flex min-h-14 items-center justify-between gap-3 py-3"
          >
            <span className="text-lg font-semibold">{server.name}</span>
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="score">
                진행 {server.openMatches} · 종료 {server.doneMatches}
              </span>
              <Pill tone={server.ready ? "brass" : "muted"}>{server.ready ? "역할 있음" : "역할 없음"}</Pill>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
