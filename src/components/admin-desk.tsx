import { useState } from "react";
import { formatKst, stateLabel } from "@/lib/raven/format";
import type { InboxTicket } from "@/lib/raven/api";
import { TicketInbox } from "@/components/ticket-inbox";
import { AlertMailForm } from "@/components/alert-mails";
import { PageHead, Pill } from "@/components/shell";

const ROLE_LABEL = [
  ["admin", "관리자"],
  ["organizer", "오거나이저"],
  ["supervisor", "슈퍼바이저"],
  ["operator", "오퍼레이터"],
  ["commander", "커맨더"],
] as const;

const CHANNEL_LABEL = [
  ["appeal", "이의"],
  ["participants", "참가자"],
  ["schedule", "일정"],
  ["results", "결과"],
  ["notification", "알림"],
  ["transcript", "기록"],
  ["thumbnail", "썸네일"],
] as const;

const TABS = ["개요", "문의", "경기", "팀", "밴", "이의", "기록"] as const;

type Tab = (typeof TABS)[number];

export type AdminBoard = {
  slug: string;
  name: string;
  guildId: string;
  openTickets: number;
  teams: number;
  rosterCount: number;
  banCount: number;
  appealCount: number;
  challonge: boolean;
  challongeUrl: string;
  alertCount: number;
  emails: [string, string, string];
  roles: Record<(typeof ROLE_LABEL)[number][0], boolean>;
  channels: Record<(typeof CHANNEL_LABEL)[number][0], string>;
  matches: {
    id: number;
    team1: string;
    team2: string;
    roundLabel: string;
    groupLabel: string;
    startsAt: string | null;
    state: string;
    scoreText: string;
    winner: string;
    judgeName: string;
    recorderName: string;
  }[];
  roster: { team: string; gameId: string; role: string; discordId: string }[];
  bans: { gameId: string; reason: string; by: string; at: string }[];
  appeals: { id: string; match: string; team: string; reason: string; status: string; decision: string; at: string }[];
  snapshots: { id: string; label: string; at: string }[];
  audit: { action: string; actor: string; detail: string; at: string }[];
};

function appealLabel(status: string): string {
  if (status === "open") return "열림";
  if (status === "review") return "검토";
  if (status === "closed") return "닫힘";
  if (status === "decided") return "결정";
  return status;
}

function roleLabel(role: string): string {
  if (role === "commander") return "커맨더";
  if (role === "member") return "팀원";
  return role;
}

export function AdminDesk({ board, tickets }: { board: AdminBoard; tickets: InboxTicket[] }) {
  const [tab, setTab] = useState<Tab>("개요");
  const teams = new Map<string, AdminBoard["roster"]>();
  for (const row of board.roster) {
    const list = teams.get(row.team) ?? [];
    list.push(row);
    teams.set(row.team, list);
  }
  return (
    <div>
      <PageHead title={board.name} />
      <p className="mt-1 text-sm text-muted">
        공개 주소 /s/{board.slug} · 서버 {board.guildId}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={item === tab ? "mc-nav is-active" : "mc-nav"}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "개요" ? <Overview board={board} /> : null}
      {tab === "문의" ? <TicketInbox tickets={tickets} /> : null}
      {tab === "경기" ? <Matches matches={board.matches} /> : null}
      {tab === "팀" ? <Teams teams={teams} /> : null}
      {tab === "밴" ? <Bans rows={board.bans} /> : null}
      {tab === "이의" ? <Appeals rows={board.appeals} /> : null}
      {tab === "기록" ? <Audit rows={board.audit} snapshots={board.snapshots} /> : null}
    </div>
  );
}

function Overview({ board }: { board: AdminBoard }) {
  const stats = [
    ["열린 문의", String(board.openTickets)],
    ["팀", String(board.teams)],
    ["로스터", String(board.rosterCount)],
    ["밴", String(board.banCount)],
    ["이의", String(board.appealCount)],
    ["경기", String(board.matches.length)],
  ];
  return (
    <div className="mt-6">
      <dl className="grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="mc-panel p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-3xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 flex flex-wrap gap-2">
        {ROLE_LABEL.map(([key, label]) => (
          <li key={key}>
            <Pill tone={board.roles[key] ? "brass" : "muted"}>
              {label} {board.roles[key] ? "있음" : "없음"}
            </Pill>
          </li>
        ))}
      </ul>
      <ul className="mc-panel mt-4 divide-y divide-line px-4">
        {CHANNEL_LABEL.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span>{label} 채널</span>
            <span className="text-muted">{board.channels[key] ? "설정됨" : "없음"}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 py-3 text-sm">
          <span>챌롱</span>
          {board.challongeUrl.startsWith("http") ? (
            <a className="text-accent" href={board.challongeUrl} target="_blank" rel="noreferrer">
              연결됨
            </a>
          ) : (
            <span className="text-muted">{board.challonge ? "연결됨" : "없음"}</span>
          )}
        </li>
      </ul>
      <AlertMailForm key={board.emails.join("|")} slug={board.slug} emails={board.emails} />
    </div>
  );
}

function Matches({ matches }: { matches: AdminBoard["matches"] }) {
  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {matches.length === 0 ? <li className="py-4 text-sm text-muted">경기가 없습니다. 디스코드에서 만듭니다.</li> : null}
      {matches.map((match) => (
        <li key={match.id} className="py-3">
          <p className="font-semibold">
            {match.team1} 대 {match.team2}
          </p>
          <p className="text-sm text-muted">
            {[
              stateLabel(match.state),
              match.roundLabel,
              match.groupLabel,
              formatKst(match.startsAt),
              match.scoreText,
              match.winner ? `승 ${match.winner}` : "",
              match.judgeName ? `심판 ${match.judgeName}` : "",
              match.recorderName ? `기록 ${match.recorderName}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Teams({ teams }: { teams: Map<string, AdminBoard["roster"]> }) {
  const names = [...teams.keys()];
  return (
    <div className="mt-6 grid gap-3">
      {names.length === 0 ? <p className="text-sm text-muted">로스터가 없습니다.</p> : null}
      {names.map((name) => (
        <section key={name} className="mc-panel p-4">
          <h2 className="font-semibold">
            {name} · {teams.get(name)?.length ?? 0}명
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {teams.get(name)?.map((row) => (
              <li key={`${row.gameId}-${row.discordId}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span>
                  {row.gameId} · {roleLabel(row.role)}
                </span>
                <span className="text-muted">{row.discordId || "디스코드 없음"}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Bans({ rows }: { rows: AdminBoard["bans"] }) {
  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {rows.length === 0 ? <li className="py-4 text-sm text-muted">밴이 없습니다.</li> : null}
      {rows.map((row) => (
        <li key={row.gameId} className="py-3 text-sm">
          <p className="font-semibold">{row.gameId}</p>
          <p className="text-muted">
            {row.reason} · {row.by || "기록 없음"} · {formatKst(row.at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Appeals({ rows }: { rows: AdminBoard["appeals"] }) {
  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {rows.length === 0 ? <li className="py-4 text-sm text-muted">이의가 없습니다.</li> : null}
      {rows.map((row) => (
        <li key={row.id} className="py-3 text-sm">
          <p className="font-semibold">
            {row.team || "팀 없음"} · {appealLabel(row.status)}
          </p>
          <p>{row.reason}</p>
          <p className="text-muted">
            {[row.match, row.decision, formatKst(row.at)].filter(Boolean).join(" · ")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Audit({ rows, snapshots }: { rows: AdminBoard["audit"]; snapshots: AdminBoard["snapshots"] }) {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold">스냅샷</h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {snapshots.length === 0 ? <li className="py-3 text-sm text-muted">스냅샷이 없습니다.</li> : null}
        {snapshots.map((row) => (
          <li key={row.id} className="flex justify-between gap-3 py-3 text-sm">
            <span>{row.label || row.id}</span>
            <span className="text-muted">{formatKst(row.at)}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 text-sm font-semibold">명령 기록</h2>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {rows.length === 0 ? <li className="py-3 text-sm text-muted">기록이 없습니다.</li> : null}
        {rows.map((row, index) => (
          <li key={`${row.action}-${row.at}-${index}`} className="py-3 text-sm">
            <p className="font-semibold">{row.action}</p>
            <p className="text-muted">
              {[row.actor, row.detail, formatKst(row.at)].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
