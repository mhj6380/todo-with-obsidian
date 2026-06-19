import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import {
  DEFAULT_SETTINGS,
  TodoSettings,
  TodoSettingTab,
} from "./settings";
import { VaultStore } from "./services/VaultStore";
import { DailyLogger } from "./services/DailyLogger";
import { TodoView, TODO_VIEW_TYPE } from "./views/TodoView";
import { Task } from "./model/Task";

export default class TodoPlugin extends Plugin {
  settings!: TodoSettings;
  store!: VaultStore;
  logger!: DailyLogger;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.store = new VaultStore(this.app);
    this.logger = new DailyLogger(this.app, this.store, this.settings);

    // 사이드바 뷰 등록
    this.registerView(TODO_VIEW_TYPE, (leaf) => new TodoView(leaf, this));

    // 리본 아이콘 → 뷰 열기
    this.addRibbonIcon("checkmark", "Todo 열기", () => this.activateView());

    // 명령어들
    this.addCommand({
      id: "open-todo-view",
      name: "Todo 패널 열기",
      callback: () => this.activateView(),
    });
    this.addCommand({
      id: "quick-add-todo",
      name: "할 일 빠르게 추가",
      callback: () => this.quickAdd(),
    });

    this.addSettingTab(new TodoSettingTab(this.app, this));

    // 외부(동기화 등)로 Inbox 가 바뀌면 열린 뷰를 갱신
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file.path === this.settings.inboxPath) this.refreshViews();
      })
    );
  }

  async onunload(): Promise<void> {
    // Obsidian 이 뷰 정리를 처리한다
  }

  /** 할 일 생성 + (옵션) Daily Note 기록 */
  async createTask(description: string): Promise<Task> {
    const task = await this.store.addTask(this.settings.inboxPath, description);
    await this.logger.logCreation(task);
    this.refreshViews();
    return task;
  }

  /** 완료 토글 + 완료 시 Daily Note 기록 */
  async toggleTask(task: Task, completed: boolean): Promise<void> {
    const updated = await this.store.toggleTask(task, completed);
    if (completed) {
      await this.logger.logCompletion(updated);
      new Notice(`✅ ${updated.description}`);
    }
    this.refreshViews();
  }

  private async quickAdd(): Promise<void> {
    // 간단 버전: 프롬프트 대신 뷰를 열어 입력 유도.
    // (추후 모달 입력으로 교체 예정 — Phase 3)
    await this.activateView();
  }

  /** 우측 사이드바에 Todo 뷰를 열고 포커스 */
  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(TODO_VIEW_TYPE);

    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: TODO_VIEW_TYPE, active: true });
    }
    if (leaf) workspace.revealLeaf(leaf);
  }

  private refreshViews(): void {
    this.app.workspace
      .getLeavesOfType(TODO_VIEW_TYPE)
      .forEach((leaf) => {
        const view = leaf.view;
        if (view instanceof TodoView) view.render();
      });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // 로거가 항상 최신 설정을 보도록 재생성
    this.logger = new DailyLogger(this.app, this.store, this.settings);
  }
}
