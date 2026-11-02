import { groups, rootCommands, type CommandSpec, type ScopeLevel } from "./catalog.ts";

export const LEVEL_KO: Record<ScopeLevel, string> = {
  admin: "관리",
  organizer: "오거나이저",
  supervisor: "슈퍼바이저",
  operator: "오퍼레이터",
};

export const GROUP_KO: Record<string, { title: string; note: string }> = {
  config: { title: "설정", note: "서버마다 따로 저장됩니다. 역할을 묶기 전에는 그 서버의 다른 명령이 잠깁니다." },
  events: { title: "일정", note: "경기 생성, 배정, 체크인, 결과. 웹에서는 동작하지 않고 이 슬래시만 동작합니다." },
  general: { title: "채널", note: "지금 보고 있는 채널의 권한과 삭제." },
  ticket: { title: "문의", note: "그 서버 안의 티켓. 웹 문의함과는 섞이지 않습니다." },
  challonge: { title: "챌롱", note: "그 서버에 묶인 토너먼트만 읽습니다." },
  participants: { title: "로스터", note: "팀 명단과 밴은 서버 밖으로 나가지 않습니다." },
  stats: { title: "통계", note: "그 서버의 숫자만 보여 줍니다." },
  audit: { title: "감사", note: "그 서버에서 성공한 명령 기록." },
  appeal: { title: "이의", note: "이의 번호는 그 서버 안에서만 찾습니다." },
  maintenance: { title: "백업", note: "스냅샷은 그 서버만 저장하고, 다른 서버로 복원되지 않습니다." },
  random: { title: "도구", note: "시간 추첨과 맵 추첨. 웹 도구 페이지는 꺼 두었습니다." },
  root: { title: "단독 명령", note: "코인 토스도 여기 있습니다. 웹에서는 던지지 않습니다." },
};

const KO: Record<string, string> = {
  config_set: "역할, 채널, 챌롱, 공개 주소, 표시 이름, 비상 메일 3곳을 이 서버에 저장합니다. 메일을 비우려면 - 를 넣습니다.",
  config_show: "이 서버에 저장된 설정과 공개 주소를 보여 줍니다.",
  events_create: "경기를 만듭니다. match는 `팀A vs 팀B` 또는 경기 번호. 시각은 UTC.",
  events_edit: "이미 있는 경기의 시간, 조, 라운드, 심판, 기록, 채널을 고칩니다.",
  events_delete: "이 서버의 경기 패킷을 지웁니다.",
  events_list: "이 서버의 경기 목록. 상태나 팀 이름으로 거를 수 있습니다.",
  events_show: "경기 하나의 상태, 배정, 준비를 보여 줍니다.",
  events_results: "점수를 넣고 결과 채널이 있으면 거기에 올립니다.",
  events_staff_resign: "심판 또는 기록 배정을 비웁니다. role은 judge 또는 recorder.",
  events_reset_tournament: "이 서버의 진행 중 경기를 모두 중단합니다. confirm에 RESET.",
  events_status: "경기 상태와 팀 준비만 짧게 보여 줍니다.",
  events_checkin_open: "체크인을 엽니다.",
  events_checkin_close: "체크인을 닫고 경기를 진행 중으로 넘깁니다.",
  events_ready: "team1 또는 team2 준비를 표시합니다.",
  events_abort: "진행 중인 흐름을 중단합니다.",
  events_reopen: "중단·보관된 경기를 다시 예정으로 엽니다.",
  events_verify: "제출된 결과를 확인 처리합니다.",
  events_archive: "확인된 경기를 보관합니다.",
  events_close: "경기 채널 대화를 기록 채널로 옮기고 채널을 지웁니다.",
  events_readiness: "열린 경기의 팀 준비를 한눈에 봅니다.",
  health: "역할이 잠겼는지, 티켓·로스터·경기 수를 봅니다.",
  general_add_to_channel: "현재 채널에 멤버나 역할 권한을 줍니다.",
  general_remove_from_channel: "현재 채널에서 그 권한을 뺍니다.",
  general_delete_channel: "현재 채널을 기록한 뒤 삭제합니다.",
  general_close_channel: "지정한 채널을 잠그고, 원하면 기록을 남깁니다.",
  ticket_panel: "버그·신고·비상 버튼을 현재 채널에 붙입니다.",
  ticket_close: "이 서버의 열린 티켓을 닫습니다.",
  challonge_create: "챌롱 대진으로 이 서버에 경기 채널을 만듭니다.",
  challonge_set: "이 서버의 챌롱 주소와 CSV 로스터를 저장합니다.",
  challonge_info: "이 서버에 연결된 챌롱과 키 유무를 보여 줍니다.",
  challonge_participants: "챌롱 참가 팀을 나열합니다.",
  challonge_matches: "챌롱 경기 줄을 나열합니다.",
  challonge_refresh: "챌롱 연결 상태를 다시 읽습니다.",
  participants_upload: "CSV로 이 서버 로스터를 통째로 바꿉니다. 열은 team, game_id, role, discord_id.",
  participants_ban: "이 서버에서만 게임 아이디를 막습니다.",
  participants_check_ban: "이 서버 밴 명단에 있는지 확인합니다.",
  participants_info: "로스터를 참가자 채널 기준으로 보여 줍니다. 팀 이름으로 좁힐 수 있습니다.",
  participants_lookup: "게임 아이디로 이 서버 로스터를 찾습니다.",
  participants_show: "팀 하나의 명단을 보여 줍니다.",
  participants_sync_roles: "로스터의 커맨더에게 커맨더 역할을 붙입니다.",
  participants_history: "로스터를 올린 기록을 봅니다.",
  stats_overview: "팀, 밴, 이의, 경기 상태를 요약합니다.",
  stats_persistence: "이 서버의 마지막 스냅샷을 보여 줍니다.",
  stats_match: "경기 하나의 패킷을 보여 줍니다.",
  stats_tournament: "이 서버 운영 숫자를 보여 줍니다.",
  stats_matches: "경기 목록과 상태를 보여 줍니다.",
  stats_participants: "로스터가 얼마나 찼는지 봅니다.",
  stats_progress: "진행과 복구 상태를 요약합니다.",
  audit_list: "최근 명령 기록을 봅니다.",
  audit_export: "명령 기록을 답장 안의 텍스트로 뽑습니다.",
  appeal_create: "이의 패킷을 만들고 이의 채널이 있으면 알립니다.",
  appeal_status: "이의 번호의 상태를 봅니다.",
  appeal_review: "이의를 검토 중으로 넘깁니다.",
  appeal_decide: "승자와 이유를 적고 이의를 마무리합니다.",
  appeal_close: "이의를 닫습니다.",
  maintenance_snapshot: "이 서버의 경기·설정·로스터를 스냅샷으로 남깁니다.",
  maintenance_restore: "이 서버 스냅샷만 되돌립니다. confirm에 RESTORE.",
  random_time: "시작·끝(UTC, HH:MM) 사이에서 30분 단위로 하나를 뽑습니다. 한국 시각도 같이 보여 줍니다.",
  random_maps: "맵 풀에서 원하는 수만큼 뽑습니다. 미니 맵은 옵션.",
  generate_bracket: "챌롱 대진을 라운드 줄로 요약합니다.",
  report_result: "경기 번호와 두 점수로 결과를 올립니다. 증빙 이미지를 붙일 수 있습니다.",
  force_win: "슈퍼바이저가 승자와 점수 문자열을 강제합니다.",
  disqualify: "팀을 실격하고 그 경기가 있으면 상대 승으로 보관합니다.",
  toss: "코인을 한 번 던집니다. HEADS 또는 TAILS.",
  sync: "슬래시 명령 트리를 다시 등록합니다. 새로 초대한 서버는 전역 명령이 퍼진 뒤 보입니다.",
};

const BOT_ONLY = new Set([
  "events_create",
  "events_edit",
  "events_delete",
  "events_staff_resign",
  "events_reset_tournament",
  "events_checkin_open",
  "events_checkin_close",
  "events_ready",
  "random_time",
  "random_maps",
  "toss",
]);

export type ManualRow = {
  usage: string;
  blurb: string;
  level: string;
  botOnly: boolean;
  options: string;
};

export type ManualGroup = {
  id: string;
  title: string;
  note: string;
  rows: ManualRow[];
};

function row(group: string, command: CommandSpec): ManualRow {
  const usage = group ? `/${group} ${command.name}` : `/${command.name}`;
  const options = (command.options ?? []).map((opt) => (opt.required ? opt.name : `${opt.name}?`)).join(" ");
  return {
    usage,
    blurb: KO[command.key] ?? command.description,
    level: LEVEL_KO[command.level],
    botOnly: BOT_ONLY.has(command.key),
    options,
  };
}

export function manualGroups(): ManualGroup[] {
  const grouped = groups.map((group) => {
    const meta = GROUP_KO[group.name] ?? { title: group.name, note: group.description };
    return {
      id: group.name,
      title: meta.title,
      note: meta.note,
      rows: group.commands.map((command) => row(group.name, command)),
    };
  });
  const root = GROUP_KO.root;
  return [
    ...grouped,
    {
      id: "root",
      title: root.title,
      note: root.note,
      rows: rootCommands.map((command) => row("", command)),
    },
  ];
}

export function commandsMarkdown(): string {
  const lines = [
    "# 레이븐 토너먼트 슬래시 명령",
    "",
    "명령은 실행한 디스코드 서버에만 적용됩니다. 다른 서버의 경기, 로스터, 밴, 스냅샷은 보이지 않습니다.",
    "",
    "일정(`/events`)과 도구(`/toss`, `/random time`, `/random maps`)는 웹에서 동작하지 않습니다.",
    "",
    "권한은 그 서버의 `/config set`으로 묶은 역할입니다. 서버 관리자(Administrator)는 통과합니다.",
    "",
    "| 등급 | 의미 |",
    "|---|---|",
    "| 관리 | admin 역할. 설정, 일정 생성, 채널, 로스터 |",
    "| 오거나이저 | 이의 접수와 검토 |",
    "| 슈퍼바이저 | 중단, 검증, 실격, 강제 승 |",
    "| 오퍼레이터 | 조회, 결과 입력, 코인, 시간·맵 추첨 |",
    "",
  ];
  for (const group of manualGroups()) {
    lines.push(`## ${group.title}`, "", group.note, "");
    for (const item of group.rows) {
      const lock = item.botOnly ? " · 웹 불가" : "";
      lines.push(`- \`${item.usage}\` (${item.level}${lock})`);
      lines.push(`  ${item.blurb}`);
      if (item.options) lines.push(`  옵션: ${item.options}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
