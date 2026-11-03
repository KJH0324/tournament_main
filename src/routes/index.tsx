import { createFileRoute, Link } from "@tanstack/react-router";
import { getAdminSession, listAdminAccounts } from "@/lib/admin/gate";
import { getSurface, listServers, type ServerCard } from "@/lib/guilds/board";
import { AdminAccounts } from "@/components/admin-accounts";
import { AdminLogin, AdminLogout } from "@/components/admin-login";
import { Shell, Pill } from "@/components/shell";

export const Route = createFileRoute("/")({
  loader: async () => {
    const surface = await getSurface();
    if (!surface.admin) {
      const directory = await listServers();
      return { admin: false as const, servers: directory.servers };
    }
    const session = await getAdminSession();
    if (!session.authed) return { admin: true as const, authed: false as const };
    const directory = await listServers();
    const accounts = session.main ? await listAdminAccounts() : { accounts: [] };
    return {
      admin: true as const,
      authed: true as const,
      main: session.main,
      servers: directory.servers,
      accounts: accounts.accounts,
    };
  },
  component: Home,
});

function Home() {
  const data = Route.useLoaderData();
  if (data.admin && !data.authed) return <AdminLogin next="/" />;
  return (
    <Shell>
      <h1 className="text-3xl font-bold">{data.admin ? "관리" : "서버"}</h1>
      {data.admin ? <AdminLogout /> : null}
      {data.admin && data.main ? <AdminAccounts accounts={data.accounts} /> : null}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {data.servers.length === 0 ? (
          <li className="mc-panel p-5 text-muted">등록된 서버가 없습니다.</li>
        ) : (
          data.servers.map((server) => <ServerLink key={server.slug} server={server} />)
        )}
      </ul>
    </Shell>
  );
}

function ServerLink({ server }: { server: ServerCard }) {
  return (
    <li>
      <Link to="/s/$slug" params={{ slug: server.slug }} className="mc-panel block p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{server.name}</h2>
          <Pill tone={server.ready ? "brass" : "muted"}>{server.ready ? "역할 준비" : "설정 대기"}</Pill>
        </div>
        <p className="mt-2 text-sm text-muted">
          진행 {server.openMatches} · 종료 {server.doneMatches}
        </p>
      </Link>
    </li>
  );
}
