import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getAdminSession, listAdminAccounts } from "@/lib/admin/gate";
import { listServers } from "@/lib/guilds/board";
import { AdminAccounts } from "@/components/admin-accounts";
import { AdminLogout } from "@/components/admin-login";
import { PageHead, Pill, Shell } from "@/components/shell";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "관리 · Mission Control" }] }),
  loader: async () => {
    const session = await getAdminSession();
    if (!session.authed) throw redirect({ to: "/admin/login" });
    const directory = await listServers();
    const accounts = session.main ? await listAdminAccounts() : { accounts: [] };
    return { servers: directory.servers, main: session.main, accounts: accounts.accounts };
  },
  component: AdminHome,
});

function AdminHome() {
  const { servers, main, accounts } = Route.useLoaderData();
  return (
    <Shell>
      <PageHead title="관리">서버를 고르면 역할과 경기를 봅니다.</PageHead>
      <AdminLogout />
      {main ? <AdminAccounts accounts={accounts} /> : null}
      <ul className="mt-4 grid gap-3">
        {servers.length === 0 ? <li className="mc-panel p-5 text-muted">아직 등록된 서버가 없습니다.</li> : null}
        {servers.map((server) => (
          <li key={server.slug}>
            <Link to="/admin/s/$slug" params={{ slug: server.slug }} className="mc-panel flex items-center justify-between gap-3 p-4">
              <span>
                <span className="block text-xl font-bold">{server.name}</span>
                <span className="text-sm text-muted">/s/{server.slug}</span>
              </span>
              <Pill tone={server.ready ? "brass" : "muted"}>{server.ready ? "역할 준비" : "설정 대기"}</Pill>
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
