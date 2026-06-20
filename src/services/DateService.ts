/**
 * 가벼운 날짜 포매팅 유틸. moment 의존 없이 YYYY-MM-DD / HH:mm 만 다룬다.
 * (필요해지면 Obsidian이 노출하는 window.moment 로 교체 가능)
 */

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 오늘 날짜를 YYYY-MM-DD 로 반환 */
export function today(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 현재 시각을 HH:mm 으로 반환 */
export function nowTime(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 마감일이 오늘보다 과거인지 (YYYY-MM-DD 문자열 비교로 충분) */
export function isOverdue(dueDate?: string, ref: string = today()): boolean {
  if (!dueDate) return false;
  return dueDate < ref;
}

/** 마감일이 오늘인지 */
export function isDueToday(dueDate?: string, ref: string = today()): boolean {
  if (!dueDate) return false;
  return dueDate === ref;
}

/** 오늘부터 마감일까지 남은 일수 (음수 = 지남). 마감 없으면 null */
export function daysUntil(dueDate?: string, ref: Date = new Date()): number | null {
  if (!dueDate) return null;
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  return Math.round((due.getTime() - base.getTime()) / 86400000);
}

/** D-N 라벨 (오늘=D-DAY, 지남=D+N). 마감 없으면 null */
export function dDayLabel(dueDate?: string): string | null {
  const n = daysUntil(dueDate);
  if (n === null) return null;
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}
