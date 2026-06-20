import { ItemView, WorkspaceLeaf } from "obsidian";
import type TodoPlugin from "../main";
import { Task } from "../model/Task";
import { daysUntil, dDayLabel, isDueToday, isOverdue } from "../services/DateService";
import { TaskDetailModal } from "./TaskDetailModal";
import { CategorySuggest } from "./CategorySuggest";

export const TODO_VIEW_TYPE = "todo-with-obsidian-view";

type Filter = "all" | "today" | "overdue" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "overdue", label: "지연" },
  { key: "done", label: "완료" },
];

const UNCATEGORIZED = "미분류";

/** 사이드바 Todo UI: 추가 입력 + 필터 탭 + 카테고리 그룹 목록 + 완료/상세. */
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

    const tasks = await this.plugin.store.readTasks(
      this.plugin.settings.inboxPath
    );
    const categories = [
      ...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c)),
    ];

    this.renderInputRow(container, categories);
    this.renderFilterTabs(container);
    this.renderGroups(container, this.applyFilter(tasks));
  }

  private renderInputRow(container: HTMLElement, categories: string[]): void {
    const inputRow = container.createDiv({ cls: "two-input-row" });
    const input = inputRow.createEl("input", {
      type: "text",
      placeholder: "할 일 추가…",
    });
    const cat = inputRow.createEl("input", {
      type: "text",
      cls: "two-cat-input",
      placeholder: "카테고리",
    });
    if (categories.length) new CategorySuggest(this.app, cat, categories);
    const due = inputRow.createEl("input", { type: "date", cls: "two-due-input" });
    const addBtn = inputRow.createEl("button", { text: "추가" });

    const submit = async () => {
      const value = input.value.trim();
      if (!value) return;
      input.value = "";
      const dueDate = due.value || undefined;
      const category = cat.value.trim() || undefined;
      due.value = "";
      await this.plugin.createTask({ description: value, dueDate, category });
      await this.render();
    };
    addBtn.onclick = submit;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) submit();
    });
  }

  private renderFilterTabs(container: HTMLElement): void {
    const tabs = container.createDiv({ cls: "two-tabs" });
    for (const f of FILTERS) {
      const tab = tabs.createEl("button", { cls: "two-tab", text: f.label });
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
          (t) => !t.completed && (isDueToday(t.dueDate) || isOverdue(t.dueDate))
        );
      case "overdue":
        return tasks.filter((t) => !t.completed && isOverdue(t.dueDate));
      case "all":
      default:
        return tasks.filter((t) => !t.completed);
    }
  }

  /** 카테고리별로 그룹화해 렌더 (카테고리 등장 순서 유지) */
  private renderGroups(parent: HTMLElement, tasks: Task[]): void {
    if (tasks.length === 0) {
      parent.createDiv({ cls: "two-empty", text: "없음" });
      return;
    }
    const order: string[] = [];
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.category || UNCATEGORIZED;
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(t);
    }
    for (const key of order) {
      const list = groups.get(key)!;
      parent.createDiv({ cls: "two-cat", text: `${key} (${list.length})` });
      for (const task of list) this.renderTask(parent, task);
    }
  }

  private renderTask(parent: HTMLElement, task: Task): void {
    const row = parent.createDiv({ cls: "two-task" });
    if (task.completed) row.addClass("is-done");

    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = task.completed;
    checkbox.onchange = async () => {
      await this.plugin.toggleTask(task, checkbox.checked);
      await this.render();
    };

    const main = row.createDiv({ cls: "two-task-main" });
    const desc = main.createDiv({ cls: "two-task-desc", text: task.description });
    // 설명 클릭 → 상세보기/편집
    desc.onclick = () => this.openDetail(task);

    const meta = main.createDiv({ cls: "two-task-metarow" });
    if (task.detail) meta.createSpan({ cls: "two-task-meta", text: "📝" });

    // 우측 D-N 배지
    if (task.dueDate && !task.completed) {
      const n = daysUntil(task.dueDate);
      const badge = row.createSpan({ cls: "two-dday", text: dDayLabel(task.dueDate)! });
      if (n !== null && n < 0) badge.addClass("is-overdue");
      else if (n !== null && n <= 1) badge.addClass("is-urgent");
      if (n === 1) row.addClass("is-glow");
    }
  }

  private openDetail(task: Task): void {
    new TaskDetailModal(this.app, task, {
      onSave: async (changes) => {
        await this.plugin.updateTask(task, changes);
        await this.render();
      },
      onToggle: async (completed) => {
        await this.plugin.toggleTask(task, completed);
        await this.render();
      },
      onDelete: async () => {
        await this.plugin.deleteTask(task);
        await this.render();
      },
      getCategories: () => this.plugin.knownCategories(),
    }).open();
  }
}
