import { App, normalizePath, TFile, TFolder } from "obsidian";
import { isTaskLine, parseLine, serialize } from "../model/TaskParser";
import { Task } from "../model/Task";
import { today } from "./DateService";

/**
 * 볼트의 마크다운 파일에서 할 일을 읽고 쓴다.
 * 모든 변경은 평범한 .md 파일 편집이므로 Obsidian 동기화가 그대로 전파된다.
 */
export class VaultStore {
  constructor(private app: App) {}

  /** 경로의 폴더가 없으면 생성 */
  private async ensureFolder(path: string): Promise<void> {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    const existing = this.app.vault.getAbstractFileByPath(dir);
    if (existing instanceof TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
      /* 이미 존재하면 무시 */
    });
  }

  /** 파일이 없으면 초기 내용으로 생성하고 TFile 반환 */
  async ensureFile(path: string, initial = ""): Promise<TFile> {
    const p = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(p);
    if (existing instanceof TFile) return existing;
    await this.ensureFolder(p);
    return this.app.vault.create(p, initial);
  }

  /** Inbox 파일의 모든 할 일을 파싱해서 반환 */
  async readTasks(inboxPath: string): Promise<Task[]> {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(inboxPath));
    if (!(file instanceof TFile)) return [];
    const content = await this.app.vault.read(file);
    const tasks: Task[] = [];
    content.split("\n").forEach((line, i) => {
      const task = parseLine(line, inboxPath, i);
      if (task) tasks.push(task);
    });
    return tasks;
  }

  /** Inbox 끝에 새 할 일을 추가하고, 만든 Task 를 반환 */
  async addTask(inboxPath: string, description: string): Promise<Task> {
    const file = await this.ensureFile(inboxPath, `# Todos\n\n`);
    const task: Task = {
      description: description.trim(),
      completed: false,
      createdDate: today(),
      filePath: inboxPath,
      lineNumber: -1,
      raw: "",
    };
    const line = serialize(task);
    await this.app.vault.process(file, (data) => {
      const trimmed = data.replace(/\s*$/, "");
      return `${trimmed}\n${line}\n`;
    });
    return task;
  }

  /**
   * 특정 줄의 할 일 완료 상태를 토글한다.
   * 줄 내용이 외부 변경으로 어긋났을 수 있으므로 설명 텍스트로 다시 찾는다.
   */
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
    const newLine = serialize(updated);

    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      // 1순위: 줄 번호가 여전히 같은 할 일이면 그 줄을 교체
      if (
        lines[task.lineNumber] !== undefined &&
        isTaskLine(lines[task.lineNumber])
      ) {
        const atLine = parseLine(lines[task.lineNumber], task.filePath, task.lineNumber);
        if (atLine && atLine.description === task.description) {
          lines[task.lineNumber] = newLine;
          return lines.join("\n");
        }
      }
      // 2순위: 설명이 일치하는 첫 할 일 줄을 교체
      for (let i = 0; i < lines.length; i++) {
        const parsed = parseLine(lines[i], task.filePath, i);
        if (parsed && parsed.description === task.description) {
          lines[i] = newLine;
          break;
        }
      }
      return lines.join("\n");
    });

    return updated;
  }
}
