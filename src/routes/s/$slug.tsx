import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAdminSession } from "@/lib/admin/gate";
import { getAdminBoard, getServerBoard, getSurface } from "@/lib/guilds/board";
import { NotFoundPage } from "@/lib/error-component";
import { formatKst, stateLabel } from "@/lib/raven/format";
import { AdminShell, PageHead, Pill, Shell } from "@/components/shell";
import { listInbox } from "@/lib/raven/api";
import { AdminDesk } from "@/components/admin-desk";
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

function ServerPage() {
  const data = Route.useLoaderData();
  if (data.admin && !data.authed) return <AdminLogin next={`/s/${data.slug}`} />;
  if (data.admin) {
    return (
      <AdminShell>
        <AdminLogout />
        <AdminDesk board={data.board} tickets={data.tickets} />
      </AdminShell>
    );
  }
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
