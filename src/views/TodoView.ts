import { ItemView, WorkspaceLeaf } from "obsidian";
import type TodoPlugin from "../main";
import { Task } from "../model/Task";

export const TODO_VIEW_TYPE = "todo-with-obsidian-view";

/** 사이드바에 뜨는 Todo UI. 추가 입력 + 할 일 목록 + 완료 토글. */
export class TodoView extends ItemView {
  private plugin: TodoPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: TodoPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TODO_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Todo";
  }

  getIcon(): string {
    return "checkmark";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  /** 목록을 다시 그린다 (외부 동기화 변경 후에도 호출됨) */
  async render(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    const container = root.createDiv({ cls: "two-view" });

    // 입력 줄
    const inputRow = container.createDiv({ cls: "two-input-row" });
    const input = inputRow.createEl("input", {
      type: "text",
      placeholder: "할 일 추가…",
    });
    const addBtn = inputRow.createEl("button", { text: "추가" });

    const submit = async () => {
      const value = input.value.trim();
      if (!value) return;
      input.value = "";
      await this.plugin.createTask(value);
      await this.render();
    };
    addBtn.onclick = submit;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });

    // 목록
    const tasks = await this.plugin.store.readTasks(
      this.plugin.settings.inboxPath
    );
    const active = tasks.filter((t) => !t.completed);
    const done = tasks.filter((t) => t.completed);

    this.renderSection(container, "할 일", active);
    if (done.length > 0) {
      this.renderSection(container, "완료", done);
    }
  }

  private renderSection(parent: HTMLElement, title: string, tasks: Task[]): void {
    parent.createDiv({ cls: "two-section-title", text: title });
    if (tasks.length === 0) {
      parent.createDiv({ cls: "two-empty", text: "없음" });
      return;
    }
    for (const task of tasks) {
      const row = parent.createDiv({ cls: "two-task" });
      if (task.completed) row.addClass("is-done");

      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.checked = task.completed;
      checkbox.onchange = async () => {
        await this.plugin.toggleTask(task, checkbox.checked);
        await this.render();
      };

      const desc = row.createDiv({ cls: "two-task-desc", text: task.description });
      if (task.dueDate) {
        desc.createSpan({ cls: "two-task-meta", text: `📅 ${task.dueDate}` });
      }
    }
  }
}
