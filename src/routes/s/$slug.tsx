import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin/gate";
import { getAdminBoard, getServerBoard, getSurface } from "@/lib/guilds/board";
import { NotFoundPage } from "@/lib/error-component";
import { formatKst, stateLabel } from "@/lib/raven/format";
import { AdminShell, PageHead, Pill, Shell } from "@/components/shell";
import { listInbox, type InboxTicket } from "@/lib/raven/api";
import { TicketInbox } from "@/components/ticket-inbox";
import { AlertMailForm } from "@/components/alert-mails";
import { AdminLogin, AdminLogout } from "@/components/admin-login";

export const Route = createFileRoute("/s/$slug")({
  notFoundComponent: NotFoundPage,
  loader: async ({ params }) => {
    const surface = await getSurface();
    if (surface.admin) {
      const session = await getAdminSession();
      if (!session.authed) return { admin: true as const, authed: false as const, slug: params.slug };
      try {
        const board = await getAdminBoard({ data: { slug: params.slug } });
        const tickets = await listInbox({ data: { guildId: board.guildId } });
        return { admin: true as const, authed: true as const, board, tickets };
      } catch (error) {
        if (error instanceof Error && error.message.includes("없는 서버")) throw notFound();
        throw error;
      }
    }
    try {
      return { admin: false as const, board: await getServerBoard({ data: { slug: params.slug } }) };
    } catch (error) {
      if (error instanceof Error && error.message.includes("없는 서버")) throw notFound();
      throw error;
    }
  },
  component: ServerPage,
});

const ROLE_LABEL = [
  ["admin", "관리자"],
  ["organizer", "오거나이저"],
  ["supervisor", "슈퍼바이저"],
  ["operator", "오퍼레이터"],
  ["commander", "커맨더"],
] as const;

function ServerPage() {
  const data = Route.useLoaderData();
  if (data.admin && !data.authed) return <AdminLogin next={`/s/${data.slug}`} />;
  if (data.admin) return <AdminView board={data.board} tickets={data.tickets} />;
  return <PublicView board={data.board} />;
}

function PublicView({ board }: { board: { slug: string; name: string; matches: Match[] } }) {
  const upcoming = board.matches.filter((match) => match.state !== "verified" && match.state !== "archived" && match.state !== "aborted");
  const done = board.matches.filter((match) => match.state === "verified" || match.state === "archived").slice().reverse().slice(0, 8);
  const aborted = board.matches.filter((match) => match.state === "aborted");

  return (
    <Shell>
      <PageHead title={board.name} />
      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-accent">다음 경기</h2>
        {upcoming.length === 0 ? (
          <p className="mc-panel mt-3 p-5 text-muted">경기가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {upcoming.map((match) => (
              <li key={match.id} className="mc-panel p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    {[match.roundLabel, match.groupLabel && `${match.groupLabel}조`, formatKst(match.startsAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <Pill tone={match.state === "in_progress" ? "brass" : "muted"}>{stateLabel(match.state)}</Pill>
                </div>
                <h3 className="mt-3 text-3xl font-bold">
                  {match.team1}
                  <span className="mx-2 text-xl text-muted">대</span>
                  {match.team2}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  심판 {match.judgeName || "미정"} · 기록 {match.recorderName || "미정"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-accent">최근 결과</h2>
        {done.length === 0 ? (
          <p className="mc-panel mt-3 p-5 text-muted">결과가 없습니다.</p>
        ) : (
          <ul className="mc-panel mt-3 divide-y divide-line px-4">
            {done.map((match) => (
              <li key={match.id} className="py-4">
                <p className="text-xl font-bold">
                  {match.team1} <span className="text-base text-muted">대</span> {match.team2}
                </p>
                <p className="text-sm text-muted">
                  {match.scoreText || "—"}
                  {match.winner ? ` · 승 ${match.winner}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {aborted.length === 0 ? null : (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted">중단</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {aborted.map((match) => (
              <li key={match.id} className="flex items-center justify-between py-3 text-sm text-muted">
                <span>
                  {match.team1} 대 {match.team2}
                </span>
                <span>중단</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

type Match = {
  id: number;
  team1: string;
  team2: string;
  roundLabel: string;
  groupLabel: string;
  startsAt: string | null;
  status: string;
  state: string;
  scoreText: string;
  winner: string;
  judgeName: string;
  recorderName: string;
};

function AdminView({
  board,
  tickets,
}: {
  board: {
    slug: string;
    name: string;
    guildId: string;
    openTickets: number;
    challonge: boolean;
    alertCount: number;
    emails: [string, string, string];
    roles: Record<(typeof ROLE_LABEL)[number][0], boolean>;
    matches: Match[];
    audit: { action: string; at: string }[];
  };
  tickets: InboxTicket[];
}) {
  return (
    <AdminShell>
      <PageHead title={board.name} />
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
      <TicketInbox tickets={tickets} />
      <ul className="mt-3 grid gap-3">
        {board.matches.length === 0 ? (
          <li className="mc-panel p-4 text-muted">경기가 없습니다.</li>
        ) : (
          board.matches.map((match) => (
            <li key={match.id} className="mc-panel p-4">
              <p className="font-bold">
                {match.team1} 대 {match.team2}
              </p>
              <p className="text-sm text-muted">{[stateLabel(match.state), formatKst(match.startsAt), match.scoreText].filter(Boolean).join(" · ")}</p>
            </li>
          ))
        )}
      </ul>
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
