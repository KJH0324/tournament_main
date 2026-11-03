export function formatKst(iso: string | null): string {
  if (!iso) return "시간 미정";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "시간 미정";
  const text = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${text} KST`;
}

export function toKstInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

export function kstInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function stateLabel(state: string): string {
  if (state === "in_progress") return "진행";
  if (state === "checkin_open") return "체크인";
  if (state === "result_submitted") return "검증 대기";
  if (state === "verified" || state === "archived") return "확정";
  if (state === "aborted") return "중단";
  return "예정";
}

export const TICKET_LABEL = {
  bug: "버그",
  report: "경기 문제",
  emergency: "비상",
} as const;
