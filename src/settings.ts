import { App, PluginSettingTab, Setting } from "obsidian";
import type TodoPlugin from "./main";

export interface TodoSettings {
  /** 활성 할 일이 저장되는 파일 */
  inboxPath: string;
  /** Daily Note 폴더 */
  dailyFolder: string;
  /** 완료 시 Daily Note 에 기록할지 */
  logCompletions: boolean;
  /** 생성 시 Daily Note 에 기록할지 */
  logCreations: boolean;
  /** 완료 로그가 들어갈 제목 */
  completedHeading: string;
  /** 생성 로그가 들어갈 제목 */
  createdHeading: string;
}

export const DEFAULT_SETTINGS: TodoSettings = {
  inboxPath: "Todos/Inbox.md",
  dailyFolder: "Daily",
  logCompletions: true,
  logCreations: false,
  completedHeading: "## ✅ 완료한 일",
  createdHeading: "## ➕ 추가한 일",
};

export class TodoSettingTab extends PluginSettingTab {
  plugin: TodoPlugin;

  constructor(app: App, plugin: TodoPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("할 일 파일 (Inbox)")
      .setDesc("활성 할 일이 저장될 마크다운 파일 경로")
      .addText((t) =>
        t
          .setPlaceholder("Todos/Inbox.md")
          .setValue(this.plugin.settings.inboxPath)
          .onChange(async (v) => {
            this.plugin.settings.inboxPath = v.trim() || "Todos/Inbox.md";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Daily Note 폴더")
      .setDesc("날짜별 기록(YYYY-MM-DD.md)이 저장될 폴더")
      .addText((t) =>
        t
          .setPlaceholder("Daily")
          .setValue(this.plugin.settings.dailyFolder)
          .onChange(async (v) => {
            this.plugin.settings.dailyFolder = v.trim() || "Daily";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("완료 시 Daily Note 에 기록")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.logCompletions).onChange(async (v) => {
          this.plugin.settings.logCompletions = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("생성 시 Daily Note 에 기록")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.logCreations).onChange(async (v) => {
          this.plugin.settings.logCreations = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("완료 로그 제목")
      .addText((t) =>
        t
          .setValue(this.plugin.settings.completedHeading)
          .onChange(async (v) => {
            this.plugin.settings.completedHeading = v || "## ✅ 완료한 일";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("생성 로그 제목")
      .addText((t) =>
        t.setValue(this.plugin.settings.createdHeading).onChange(async (v) => {
          this.plugin.settings.createdHeading = v || "## ➕ 추가한 일";
          await this.plugin.saveSettings();
        })
      );
  }
}
