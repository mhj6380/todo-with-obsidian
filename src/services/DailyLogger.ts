import { App, normalizePath } from "obsidian";
import { Task } from "../model/Task";
import { TodoSettings } from "../settings";
import { VaultStore } from "./VaultStore";
import { nowTime, today } from "./DateService";

/**
 * ★ 핵심: 할 일의 생성/완료를 그날의 Daily Note 에 자동 기록한다.
 * 이것이 "완료를 체크하면 날짜별로 착착 기록" 요구를 구현하는 부분.
 */
export class DailyLogger {
  constructor(
    private app: App,
    private store: VaultStore,
    private settings: TodoSettings
  ) {}

  private dailyPath(): string {
    return normalizePath(`${this.settings.dailyFolder}/${today()}.md`);
  }

  /** 완료된 할 일을 오늘 Daily Note 의 "완료" 섹션에 추가 */
  async logCompletion(task: Task): Promise<void> {
    if (!this.settings.logCompletions) return;
    const line = `- [x] ${task.description} (${nowTime()}) ✅ ${today()}`;
    await this.appendUnderHeading(this.settings.completedHeading, line);
  }

  /** 생성된 할 일을 오늘 Daily Note 의 "추가" 섹션에 기록 (옵션) */
  async logCreation(task: Task): Promise<void> {
    if (!this.settings.logCreations) return;
    const line = `- ${task.description} (${nowTime()})`;
    await this.appendUnderHeading(this.settings.createdHeading, line);
  }

  /**
   * 지정한 제목 아래에 한 줄을 추가한다.
   * - 파일이 없으면 만들고 제목 + 줄 생성
   * - 제목이 없으면 파일 끝에 제목 + 줄 추가
   * - 제목이 있으면 그 섹션의 마지막 목록 항목 뒤에 삽입
   */
  private async appendUnderHeading(
    heading: string,
    line: string
  ): Promise<void> {
    const path = this.dailyPath();
    const file = await this.store.ensureFile(path, `# ${today()}\n`);

    await this.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const headingIdx = lines.findIndex((l) => l.trim() === heading.trim());

      if (headingIdx === -1) {
        const trimmed = data.replace(/\s*$/, "");
        return `${trimmed}\n\n${heading}\n${line}\n`;
      }

      // 다음 제목(또는 파일 끝)까지가 이 섹션. 그 끝 직전에 삽입.
      let insertAt = lines.length;
      for (let i = headingIdx + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) {
          insertAt = i;
          break;
        }
      }
      // 섹션 끝의 빈 줄들은 건너뛰어 마지막 내용 바로 뒤에 넣는다
      while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === "") {
        insertAt--;
      }
      lines.splice(insertAt, 0, line);
      return lines.join("\n");
    });
  }
}
