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
