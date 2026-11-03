import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin/gate";
import { getAdminBoard } from "@/lib/guilds/board";
import { formatKst, stateLabel } from "@/lib/raven/format";
import { AlertMailForm } from "@/components/alert-mails";
import { AdminLogout } from "@/components/admin-login";
import { AdminShell, PageHead, Pill } from "@/components/shell";

export const Route = createFileRoute("/admin/s/$slug")({
  head: () => ({ meta: [{ title: "관리 · KJH Bot" }] }),
  loader: async ({ params }) => {
    const session = await getAdminSession();
    if (!session.authed) throw redirect({ to: "/admin/login" });
    return getAdminBoard({ data: { slug: params.slug } });
  },
  component: AdminServer,
});

const ROLE_LABEL = [
  ["admin", "관리"],
  ["organizer", "오거나이저"],
  ["supervisor", "슈퍼바이저"],
  ["operator", "오퍼레이터"],
  ["commander", "커맨더"],
] as const;

function AdminServer() {
  const board = Route.useLoaderData();
  return (
    <AdminShell>
      <PageHead title={board.name}>/s/{board.slug}</PageHead>
      <AdminLogout />
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="mc-panel p-4">
          <dt className="text-xs text-muted">서버 아이디</dt>
          <dd className="mt-1 break-all font-semibold">{board.guildId}</dd>
        </div>
        <div className="mc-panel p-4">
          <dt className="text-xs text-muted">열린 티켓</dt>
          <dd className="mt-1 text-3xl font-bold">{board.openTickets}</dd>
        </div>
        <div className="mc-panel p-4">
          <dt className="text-xs text-muted">챌롱</dt>
          <dd className="mt-1 text-xl font-bold">{board.challonge ? "연결됨" : "없음"}</dd>
        </div>
        <div className="mc-panel p-4">
          <dt className="text-xs text-muted">비상 메일</dt>
          <dd className="mt-1 text-xl font-bold">{board.alertCount}명</dd>
        </div>
      </dl>
      <ul className="mt-4 flex flex-wrap gap-2">
        {ROLE_LABEL.map(([key, label]) => (
          <li key={key}>
            <Pill tone={board.roles[key] ? "brass" : "muted"}>
              {label} {board.roles[key] ? "묶임" : "비어 있음"}
            </Pill>
          </li>
        ))}
      </ul>
      <AlertMailForm key={board.emails.join("|")} slug={board.slug} emails={board.emails} />
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-accent">경기</h2>
        <ul className="mt-3 grid gap-3">
          {board.matches.length === 0 ? (
            <li className="mc-panel p-4 text-muted">경기가 없습니다.</li>
          ) : (
            board.matches.map((match) => (
              <li key={match.id} className="mc-panel p-4">
                <p className="font-bold">
                  {match.team1} 대 {match.team2}
                </p>
                <p className="text-sm text-muted">
                  {[stateLabel(match.state), formatKst(match.startsAt), match.scoreText].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-accent">최근 명령</h2>
        <ul className="mc-panel mt-3 divide-y divide-line px-4">
          {board.audit.length === 0 ? (
            <li className="py-4 text-muted">기록이 없습니다.</li>
          ) : (
            board.audit.map((row, index) => (
              <li key={`${row.action}-${index}`} className="flex justify-between gap-3 py-3 text-sm">
                <span className="font-semibold">{row.action}</span>
                <span className="text-muted">{formatKst(row.at)}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminShell>
  );
}
