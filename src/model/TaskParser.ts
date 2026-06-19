import { EMOJI, Task } from "./Task";

/** 체크박스 줄 매칭: 선택적 들여쓰기 + `- [ ]` 또는 `- [x]` */
const TASK_LINE = /^(\s*)- \[( |x|X)\]\s+(.*)$/;

const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const reCreated = new RegExp(`${EMOJI.created}\\s*${DATE}`);
const reDue = new RegExp(`${EMOJI.due}\\s*${DATE}`);
const reDone = new RegExp(`${EMOJI.done}\\s*${DATE}`);

/** 한 줄이 할 일인지 검사 */
export function isTaskLine(line: string): boolean {
  return TASK_LINE.test(line);
}

/** 마크다운 한 줄을 Task 로 파싱. 할 일이 아니면 null */
export function parseLine(
  line: string,
  filePath: string,
  lineNumber: number
): Task | null {
  const m = line.match(TASK_LINE);
  if (!m) return null;

  const checkmark = m[2];
  let body = m[3];

  const createdDate = body.match(reCreated)?.[1];
  const dueDate = body.match(reDue)?.[1];
  const completedDate = body.match(reDone)?.[1];

  // 메타데이터 이모지를 떼어내 순수 설명만 남긴다
  const description = body
    .replace(reCreated, "")
    .replace(reDue, "")
    .replace(reDone, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    description,
    completed: checkmark.toLowerCase() === "x",
    createdDate,
    dueDate,
    completedDate,
    filePath,
    lineNumber,
    raw: line,
  };
}

/** Task 를 마크다운 한 줄로 직렬화 (들여쓰기는 유지하지 않고 최상위로 가정) */
export function serialize(task: Task): string {
  const box = task.completed ? "x" : " ";
  const parts = [`- [${box}] ${task.description}`];
  if (task.createdDate) parts.push(`${EMOJI.created} ${task.createdDate}`);
  if (task.dueDate) parts.push(`${EMOJI.due} ${task.dueDate}`);
  if (task.completed && task.completedDate) {
    parts.push(`${EMOJI.done} ${task.completedDate}`);
  }
  return parts.join(" ");
}
