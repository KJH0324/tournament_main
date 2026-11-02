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

const STATUS_LABEL = {
  open: "예정",
  live: "진행",
  done: "종료",
} as const;

export function statusLabel(status: keyof typeof STATUS_LABEL): string {
  return STATUS_LABEL[status];
}

export const TICKET_LABEL = {
  bug: "버그",
  report: "경기 문제",
  emergency: "비상",
} as const;
