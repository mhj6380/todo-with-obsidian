import { ItemView, WorkspaceLeaf } from "obsidian";
import type TodoPlugin from "../main";
import { Task } from "../model/Task";
import { isDueToday, isOverdue } from "../services/DateService";

export const TODO_VIEW_TYPE = "todo-with-obsidian-view";

type Filter = "all" | "today" | "overdue" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "overdue", label: "지연" },
  { key: "done", label: "완료" },
];

/** 사이드바 Todo UI: 추가 입력 + 필터 탭 + 목록 + 완료 토글. */
export class TodoView extends ItemView {
  private plugin: TodoPlugin;
  private filter: Filter = "all";

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

    this.renderInputRow(container);
    this.renderFilterTabs(container);

    const tasks = await this.plugin.store.readTasks(
      this.plugin.settings.inboxPath
    );
    this.renderList(container, this.applyFilter(tasks));
  }

  private renderInputRow(container: HTMLElement): void {
    const inputRow = container.createDiv({ cls: "two-input-row" });
    const input = inputRow.createEl("input", {
      type: "text",
      placeholder: "할 일 추가…",
    });
    const due = inputRow.createEl("input", { type: "date", cls: "two-due-input" });
    const addBtn = inputRow.createEl("button", { text: "추가" });

    const submit = async () => {
      const value = input.value.trim();
      if (!value) return;
      input.value = "";
      const dueDate = due.value || undefined;
      due.value = "";
      await this.plugin.createTask(value, dueDate);
      await this.render();
    };
    addBtn.onclick = submit;
    input.addEventListener("keydown", (e) => {
      // IME(한글 등) 조합 중 Enter 는 글자를 깨뜨리므로 무시
      if (e.key === "Enter" && !e.isComposing) submit();
    });
  }

  private renderFilterTabs(container: HTMLElement): void {
    const tabs = container.createDiv({ cls: "two-tabs" });
    for (const f of FILTERS) {
      const tab = tabs.createEl("button", {
        cls: "two-tab",
        text: f.label,
      });
      if (f.key === this.filter) tab.addClass("is-active");
      tab.onclick = async () => {
        this.filter = f.key;
        await this.render();
      };
    }
  }

  private applyFilter(tasks: Task[]): Task[] {
    switch (this.filter) {
      case "done":
        return tasks.filter((t) => t.completed);
      case "today":
        return tasks.filter(
          (t) =>
            !t.completed &&
            (isDueToday(t.dueDate) || isOverdue(t.dueDate))
        );
      case "overdue":
        return tasks.filter((t) => !t.completed && isOverdue(t.dueDate));
      case "all":
      default:
        return tasks.filter((t) => !t.completed);
    }
  }

  private renderList(parent: HTMLElement, tasks: Task[]): void {
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

      const desc = row.createDiv({
        cls: "two-task-desc",
        text: task.description,
      });
      if (task.dueDate) {
        const overdue = !task.completed && isOverdue(task.dueDate);
        const meta = desc.createSpan({
          cls: "two-task-meta",
          text: `📅 ${task.dueDate}`,
        });
        if (overdue) meta.addClass("is-overdue");
      }
    }
  }
}
