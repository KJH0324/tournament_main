import { createFileRoute, Link } from "@tanstack/react-router";
import { getAdminSession, listAdminAccounts } from "@/lib/admin/gate";
import { getSurface, listServers, type ServerCard } from "@/lib/guilds/board";
import { CommandList } from "@/components/command-list";
import { manualGroups } from "@/lib/discord/manual";
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
    return {
      admin: true as const,
      authed: true as const,
      main: session.main,
      servers: directory.servers,
      accounts: accounts.accounts,
      groups,
    };
  },
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  if (data.admin && !data.authed) return <AdminLogin next="/" />;
  if (data.admin && data.authed) {
    return (
      <AdminShell>
        <h1 className="text-3xl font-bold">관리</h1>
        <AdminLogout />
        {data.main ? <AdminAccounts accounts={data.accounts} /> : null}
        <ServerList servers={data.servers} admin />
      </AdminShell>
    );
  }
  return (
    <Shell>
      <h1 className="text-3xl font-bold">KJH Bot</h1>
      <p className="mt-1 text-sm text-muted">레이븐 토너먼트</p>
      <ServerList servers={data.servers} admin={false} />
      <section id="commands" className="mt-10">
        <h2 className="text-2xl font-bold">슬래시 명령어</h2>
        <div className="mt-4">
          <CommandList groups={data.groups} />
        </div>
      </section>
    </Shell>
  );
}

function ServerList({ servers, admin }: { servers: ServerCard[]; admin: boolean }) {
  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {servers.length === 0 ? <li className="py-4 text-sm text-muted">등록된 서버가 없습니다.</li> : null}
      {servers.map((server) => (
        <li key={server.slug}>
          <Link
            to={admin ? "/admin/s/$slug" : "/s/$slug"}
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
