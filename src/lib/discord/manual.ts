import { groups, rootCommands, type CommandSpec, type OptSpec, type ScopeLevel } from "./catalog.ts";

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

export type ManualOption = {
  name: string;
  required: boolean;
  meaning: string;
  value: string;
};

export type ManualRow = {
  usage: string;
  blurb: string;
  level: string;
  botOnly: boolean;
  options: string;
  fields: ManualOption[];
};

export type ManualGroup = {
  id: string;
  title: string;
  note: string;
  rows: ManualRow[];
};

const OPTION_KO: Record<string, string> = {
  "Admin role": "관리 역할",
  "Organizer role": "오거나이저 역할",
  "Supervisor role": "슈퍼바이저 역할",
  "Operator role": "오퍼레이터 역할",
  "Commander role": "커맨더 역할",
  "Deny fallback when roles are missing": "역할이 비어 있으면 명령을 막을지",
  "Maximum concurrent active matches": "동시에 진행할 수 있는 경기 수",
  "Maximum members tracked per team": "팀당 로스터 인원 상한",
  "Maximum rows in a roster upload": "로스터 CSV 최대 행 수",
  "Appeal review channel": "이의 검토 채널",
  "Participant roster channel": "참가자 명단 채널",
  "Schedule channel": "일정 채널",
  "Result announcement channel": "결과 공지 채널",
  "Notification channel": "알림 채널",
  "Transcript channel": "대화 기록 채널",
  "Thumbnail channel": "썸네일 채널",
  "Tournament logo URL": "대회 로고 주소",
  "Challonge tournament URL or ID": "챌롱 대회 주소 또는 아이디",
  "Public board path. Lowercase letters, numbers, hyphen.": "공개 주소. 영문 소문자, 숫자, 하이픈",
  "Name shown on the public board": "공개 화면에 보이는 서버 이름",
  Day: "일",
  Month: "월",
  Year: "연도",
  "Hour UTC": "시. UTC",
  "Minute UTC": "분. UTC",
  "Tournament name": "대회 이름",
  Group: "조",
  Round: "라운드",
  "Target channel": "올릴 채널",
  "Commander 1": "1팀 커맨더",
  "Commander 2": "2팀 커맨더",
  Judge: "심판",
  Recorder: "기록",
  "Image URL": "이미지 주소",
  Remarks: "비고",
  "Challonge match id, or Team A vs Team B": "챌롱 경기 번호, 또는 팀A vs 팀B",
  "Match id": "경기 번호",
  Reason: "이유",
  "Filter by event state": "경기 상태로 거르기",
  "Filter by team name fragment": "팀 이름 일부로 거르기",
  "Start from YYYY-MM-DD HH:MM UTC": "이 시각부터. YYYY-MM-DD HH:MM, UTC",
  "Until YYYY-MM-DD HH:MM UTC": "이 시각까지. YYYY-MM-DD HH:MM, UTC",
  "Team 1 score": "1팀 점수",
  "Team 2 score": "2팀 점수",
  "Number of matches": "세트 수",
  "Replay link": "리플레이 주소",
  "judge or recorder": "judge 또는 recorder",
  "Type RESET to confirm": "확인하려면 RESET",
  "team1 or team2": "team1 또는 team2",
  "Abort reason": "중단 이유",
  "Optional winner name": "승자 이름. 비워도 됩니다",
  "Archive reason": "보관 이유",
  "Optional match id": "경기 번호. 비워도 됩니다",
  "Member or role to authorize": "권한을 줄 멤버 또는 역할",
  "Member or role to remove": "권한을 뺄 멤버 또는 역할",
  "Archive transcript before delete": "지우기 전에 대화를 기록할지",
  "Target text channel": "대상 텍스트 채널",
  "Archive transcript before lock": "잠그기 전에 대화를 기록할지",
  "Target category": "채널을 만들 카테고리",
  "Challonge URL or tournament ID": "챌롱 주소 또는 대회 아이디",
  "Optional CSV roster": "로스터 CSV. 없어도 됩니다",
  "CSV roster file": "로스터 CSV 파일",
  "Game identifier": "게임 아이디",
  "Ban reason": "밴 이유",
  "Game identifier to check": "확인할 게임 아이디",
  "Optional team name filter": "팀 이름. 비우면 전체",
  "Commander or member game identifier": "커맨더 또는 팀원 게임 아이디",
  "Team name to display": "볼 팀 이름",
  "Filter by action": "기록 종류로 거르기",
  "Maximum entries": "최대 개수",
  "Maximum records": "최대 개수",
  "Action filter": "기록 종류",
  "Actor Discord id": "실행한 사람 디스코드 아이디",
  "Maximum rows": "최대 행 수",
  "Optional filename": "파일 이름. 비워도 됩니다",
  "Match identifier": "경기 번호",
  "Affected team name": "해당 팀 이름",
  "Dispute summary": "이의 내용",
  "Evidence file": "증빙 파일",
  "Appeal identifier": "이의 번호",
  "Review notes": "검토 메모",
  "Decision reason": "결정 이유",
  "Winning team": "이긴 팀",
  "Close when finalizing": "결정과 함께 닫을지",
  "Closure reason": "종료 이유",
  "Optional snapshot label": "스냅샷 이름. 비워도 됩니다",
  "Type RESTORE to confirm": "확인하려면 RESTORE",
  "Optional snapshot id": "스냅샷 번호. 비우면 최근 것",
  "Window start HH:MM UTC": "시작 시각. HH:MM, UTC",
  "Window end HH:MM UTC": "끝 시각. HH:MM, UTC",
  "Number of maps to draw": "뽑을 맵 수",
  "Include mini map variants": "미니 맵도 넣을지",
  "Score for team A": "A팀 점수",
  "Score for team B": "B팀 점수",
  "Optional image proof": "증빙 이미지. 없어도 됩니다",
  "Optional notes": "메모. 비워도 됩니다",
  "Winner team name": "이긴 팀 이름",
  "Score in A-B format": "점수. A-B 형식",
  "Team name to disqualify": "실격시킬 팀 이름",
  "Disqualification reason": "실격 이유",
};

function optionMeaning(opt: OptSpec): string {
  const mail = opt.name.match(/^alert_email_(\d)$/);
  if (mail) return `비상 알림 메일 ${mail[1]}. 지울 때는 -`;
  const shot = opt.name.match(/^screenshot(\d)$/);
  if (shot) return `결과 이미지 주소 ${shot[1]}`;
  const evidence = opt.name.match(/^evidence(\d)$/);
  if (evidence) return `증빙 파일 ${evidence[1]}`;
  return OPTION_KO[opt.description] ?? opt.description;
}

function optionValue(opt: OptSpec): string {
  if (opt.type === "integer") {
    if (opt.min != null && opt.max != null) return `${opt.min}–${opt.max} 정수`;
    return "정수";
  }
  if (opt.type === "role") return "서버 역할";
  if (opt.type === "user") return "서버 멤버";
  if (opt.type === "channel") return "텍스트 채널";
  if (opt.type === "boolean") return "true 또는 false";
  if (opt.type === "attachment") return "첨부 파일";
  if (opt.type === "mentionable") return "멤버 또는 역할";
  const text = opt.description;
  if (/email/i.test(text)) return "메일 주소. 지울 때는 -";
  if (/url|URL|link|logo/i.test(text)) return "http 또는 https 주소";
  if (/YYYY-MM-DD/.test(text)) return text;
  if (/lowercase/i.test(text)) return "영문 소문자, 숫자, 하이픈";
  if (/RESET|RESTORE/.test(text)) return text;
  return "문자열";
}

function row(group: string, command: CommandSpec): ManualRow {
  const usage = group ? `/${group} ${command.name}` : `/${command.name}`;
  const specs = command.options ?? [];
  const options = specs.map((opt) => (opt.required ? opt.name : `${opt.name}?`)).join(" ");
  return {
    usage,
    blurb: KO[command.key] ?? command.description,
    level: LEVEL_KO[command.level],
    botOnly: BOT_ONLY.has(command.key),
    options,
    fields: specs.map((opt) => ({
      name: opt.name,
      required: Boolean(opt.required),
      meaning: optionMeaning(opt),
      value: optionValue(opt),
    })),
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
