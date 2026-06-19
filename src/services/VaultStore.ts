import { App, normalizePath, TFile, TFolder } from "obsidian";
import {
  isTaskLine,
  parseDocument,
  parseLine,
  serialize,
  serializeBlock,
} from "../model/TaskParser";
import { Task } from "../model/Task";
import { today } from "./DateService";

const HEADING_RE = /^#{1,6}\s+/;
const INDENT_RE = /^(?:\t| {2,})/;

/** 새 할 일 입력 값 */
export interface NewTask {
  description: string;
  dueDate?: string;
  category?: string;
  detail?: string;
}

/**
 * 볼트의 마크다운 파일에서 할 일을 읽고 쓴다.
 * 카테고리는 `## 헤딩` 섹션, 상세내용은 할 일 줄 아래 들여쓰기 블록으로 저장된다.
 */
export class VaultStore {
  constructor(private app: App) {}

  private async ensureFolder(path: string): Promise<void> {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    const existing = this.app.vault.getAbstractFileByPath(dir);
    if (existing instanceof TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {});
  }

  async ensureFile(path: string, initial = ""): Promise<TFile> {
    const p = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(p);
    if (existing instanceof TFile) return existing;
    await this.ensureFolder(p);
    return this.app.vault.create(p, initial);
  }

  /** Inbox 의 모든 할 일을 (카테고리·상세 포함) 파싱해서 반환 */
  async readTasks(inboxPath: string): Promise<Task[]> {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(inboxPath));
    if (!(file instanceof TFile)) return [];
    const content = await this.app.vault.read(file);
    return parseDocument(content, inboxPath);
  }

  /** 새 할 일을 (카테고리 섹션 아래) 추가하고 만든 Task 를 반환 */
  async addTask(inboxPath: string, input: NewTask): Promise<Task> {
    const file = await this.ensureFile(inboxPath, `# Todos\n`);
    const task: Task = {
      description: input.description.trim(),
      completed: false,
      createdDate: today(),
      dueDate: input.dueDate || undefined,
      category: input.category?.trim() || undefined,
      detail: input.detail?.trim() ? input.detail.trim() : undefined,
      filePath: inboxPath,
      lineNumber: -1,
      raw: "",
    };
    const block = serializeBlock(task);
    await this.app.vault.process(file, (data) =>
      insertBlock(data, block, task.category)
    );
    return task;
  }

  /** 완료 상태 토글. 할 일 줄만 교체하고 상세 블록은 보존한다. */
  async toggleTask(task: Task, completed: boolean): Promise<Task> {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(task.filePath)
    );
    if (!(file instanceof TFile)) return task;

    const updated: Task = {
      ...task,
      completed,
      completedDate: completed ? today() : undefined,
    };

    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const range = findBlock(lines, task);
      if (!range) return data;
      lines[range.start] = serialize(updated);
      return lines.join("\n");
    });
    return updated;
  }

  /**
   * 할 일을 수정한다(설명/마감일/카테고리/상세). 카테고리가 바뀌면
   * 기존 블록을 떼어내 새 카테고리 섹션으로 옮긴다.
   */
  async updateTask(original: Task, changes: Partial<Task>): Promise<Task> {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(original.filePath)
    );
    if (!(file instanceof TFile)) return original;

    const next: Task = {
      ...original,
      ...changes,
      description: (changes.description ?? original.description).trim(),
      category:
        (changes.category ?? original.category)?.toString().trim() || undefined,
      detail:
        (changes.detail ?? original.detail)?.toString().trim() || undefined,
    };

    await this.app.vault.process(file, (data) => {
      let lines = data.split("\n");
      const range = findBlock(lines, original);
      if (range) lines.splice(range.start, range.end - range.start);
      const block = serializeBlock(next);
      return insertBlock(lines.join("\n"), block, next.category);
    });
    return next;
  }

  /** 할 일(상세 블록 포함)을 삭제한다. */
  async deleteTask(task: Task): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(task.filePath)
    );
    if (!(file instanceof TFile)) return;
    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const range = findBlock(lines, task);
      if (!range) return data;
      lines.splice(range.start, range.end - range.start);
      return lines.join("\n");
    });
  }
}

/** 할 일 블록(시작 줄 ~ 상세 끝)의 범위를 찾는다. */
function findBlock(
  lines: string[],
  task: Task
): { start: number; end: number } | null {
  let start = -1;
  const atLine = lines[task.lineNumber];
  if (atLine !== undefined && isTaskLine(atLine)) {
    const t = parseLine(atLine, task.filePath, task.lineNumber);
    if (t && t.description === task.description) start = task.lineNumber;
  }
  if (start === -1) {
    for (let i = 0; i < lines.length; i++) {
      const t = parseLine(lines[i], task.filePath, i);
      if (t && t.description === task.description) {
        start = i;
        break;
      }
    }
  }
  if (start === -1) return null;

  let end = start + 1;
  while (end < lines.length && !isTaskLine(lines[end]) && INDENT_RE.test(lines[end])) {
    end++;
  }
  return { start, end };
}

/** 블록을 카테고리 섹션 끝에 삽입. 카테고리 없으면 파일 끝, 섹션 없으면 새로 만든다. */
function insertBlock(data: string, block: string, category?: string): string {
  if (!category) {
    const trimmed = data.replace(/\s*$/, "");
    return `${trimmed}\n${block}\n`;
  }
  const heading = `## ${category}`;
  const lines = data.split("\n");
  const hIdx = lines.findIndex((l) => l.trim() === heading);
  if (hIdx === -1) {
    const trimmed = data.replace(/\s*$/, "");
    return `${trimmed}\n\n${heading}\n${block}\n`;
  }
  let insertAt = lines.length;
  for (let i = hIdx + 1; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i])) {
      insertAt = i;
      break;
    }
  }
  while (insertAt > hIdx + 1 && lines[insertAt - 1].trim() === "") insertAt--;
  lines.splice(insertAt, 0, block);
  return lines.join("\n");
}
