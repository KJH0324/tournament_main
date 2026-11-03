import { createFileRoute, Link } from "@tanstack/react-router";
import { listResults } from "@/lib/guilds/board";
import { formatKst } from "@/lib/raven/format";
import { PageHead, Shell } from "@/components/shell";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "결과 · KJH Bot" }] }),
  loader: () => listResults(),
  component: ResultsPage,
});

function ResultsPage() {
  const { results } = Route.useLoaderData();

  return (
    <Shell>
      <PageHead title="결과" />
      {results.length === 0 ? (
        <p className="mc-panel mt-8 p-5 text-muted">결과가 없습니다.</p>
      ) : (
        <ul className="mc-panel mt-8 divide-y divide-line px-4">
          {results.map((match) => (
            <li key={match.id} className="grid gap-2 py-4 md:grid-cols-12 md:items-center">
              <p className="text-sm text-muted md:col-span-3">
                <Link to="/s/$slug" params={{ slug: match.slug }} className="font-semibold text-accent">
                  {match.server}
                </Link>
                <span className="mt-1 block">{[match.roundLabel, formatKst(match.startsAt)].filter(Boolean).join(" · ")}</span>
              </p>
              <p className="text-2xl font-bold md:col-span-5">
                <span className={match.winner === match.team1 ? "text-fg" : "text-muted"}>{match.team1}</span>
                <span className="mx-2 text-base font-medium text-muted">대</span>
                <span className={match.winner === match.team2 ? "text-fg" : "text-muted"}>{match.team2}</span>
              </p>
              <p className="font-semibold md:col-span-2">{match.scoreText || "—"}</p>
              <p className="text-sm text-muted md:col-span-2">{match.winner ? `승 ${match.winner}` : "승자 미정"}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
