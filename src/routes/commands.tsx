import { createFileRoute } from "@tanstack/react-router";
import { manualGroups } from "@/lib/discord/manual";
import { PageHead, Pill, Shell } from "@/components/shell";

export const Route = createFileRoute("/commands")({
  head: () => ({ meta: [{ title: "명령 · KJH Bot" }] }),
  loader: () => ({ groups: manualGroups() }),
  component: CommandsPage,
});

function CommandsPage() {
  const { groups } = Route.useLoaderData();
  return (
    <Shell>
      <PageHead title="명령" />
      <div className="mc-panel mt-6 grid gap-2 p-4 text-sm text-muted md:grid-cols-2">
        <p>관리 — 설정, 일정 생성, 채널, 로스터</p>
        <p>오거나이저 — 이의 접수</p>
        <p>슈퍼바이저 — 검증, 실격, 강제 승</p>
        <p>오퍼레이터 — 조회, 결과, 코인, 추첨</p>
      </div>
      <div className="mt-6 grid gap-4">
        {groups.map((group) => (
          <section key={group.id} id={group.id} className="mc-panel p-4 md:p-5">
            <h2 className="text-2xl font-bold">{group.title}</h2>
            <p className="mt-2 text-sm text-muted">{group.note}</p>
            <ul className="mt-4 divide-y divide-line">
              {group.rows.map((row) => (
                <li key={row.usage} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{row.usage}</p>
                    <Pill>{row.level}</Pill>
                    {row.botOnly ? <Pill tone="brass">봇 전용</Pill> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.blurb}</p>
                  {row.options ? <p className="mt-1 text-xs text-muted">옵션 {row.options}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
