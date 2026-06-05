import { ticketPriorityLabel, ticketStatusLabel } from "@/lib/ui/ticketBadges";

export function ticketTableTextShort(text: string, max = 12): string {
  const t = text.trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function ticketTableUsernameShort(text: string): string {
  const t = text.trim();
  if (!t) return "—";
  if (t.length <= 6) return t;
  return `${t.slice(0, 5)}…`;
}

export function ticketTableTimestampShort(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export function ticketPriorityCompactLabel(priorityId: number): string {
  if (priorityId === 1) return "Hi";
  if (priorityId === 2) return "Nor";
  if (priorityId === 3) return "Lo";
  return ticketPriorityLabel(priorityId);
}

export function ticketStatusCompactLabel(statusId: number): string {
  if (statusId === 1) return "Prog";
  if (statusId === 2) return "Fix";
  if (statusId === 3) return "Re";
  return ticketStatusLabel(statusId);
}
