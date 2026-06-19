import { EMOJI, Task } from "./Task";

/** 체크박스 줄 매칭: 선택적 들여쓰기 + `- [ ]` 또는 `- [x]` */
const TASK_LINE = /^(\s*)- \[( |x|X)\]\s+(.*)$/;

const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const reCreated = new RegExp(`${EMOJI.created}\\s*${DATE}`);
const reDue = new RegExp(`${EMOJI.due}\\s*${DATE}`);
const reDone = new RegExp(`${EMOJI.done}\\s*${DATE}`);

/** 헤딩 줄: `# ` ~ `###### ` */
const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
/** 들여쓰기 줄(탭 또는 공백 2칸 이상) — 상세내용 블록 */
const INDENTED = /^(?:\t| {2,})(.*)$/;

/** 한 줄이 할 일인지 검사 */
export function isTaskLine(line: string): boolean {
  return TASK_LINE.test(line);
}

/**
 * 문서 전체를 파싱해 Task 목록을 만든다.
 * - 카테고리: 직전의 `## 이상` 헤딩 텍스트 (`#` 한 개는 파일 제목 → 미분류로 리셋)
 * - 상세내용: 할 일 줄 바로 아래 연속된 들여쓰기 줄들
 */
export function parseDocument(content: string, filePath: string): Task[] {
  const lines = content.split("\n");
  const tasks: Task[] = [];
  let category: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEADING);
    if (h) {
      category = h[1].length >= 2 ? h[2].trim() : undefined;
      continue;
    }
    const task = parseLine(lines[i], filePath, i);
    if (!task) continue;

    // 상세내용: 다음 줄부터 연속된 들여쓰기 줄 (할 일 줄이 아닌)
    const detailLines: string[] = [];
    let j = i + 1;
    while (j < lines.length && !isTaskLine(lines[j])) {
      const m = lines[j].match(INDENTED);
      if (!m) break;
      detailLines.push(m[1]);
      j++;
    }
    task.category = category;
    task.detail = detailLines.length ? detailLines.join("\n") : undefined;
    tasks.push(task);
    i = j - 1;
  }
  return tasks;
}

/** Task 를 "할 일 줄 + 들여쓰기 상세 블록" 으로 직렬화 */
export function serializeBlock(task: Task, indent = "    "): string {
  let out = serialize(task);
  if (task.detail && task.detail.trim()) {
    const body = task.detail
      .replace(/\s+$/, "")
      .split("\n")
      .map((l) => indent + l)
      .join("\n");
    out += "\n" + body;
  }
  return out;
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
