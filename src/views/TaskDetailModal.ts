import { App, Modal, Setting } from "obsidian";
import { Task } from "../model/Task";

export interface TaskChanges {
  description: string;
  dueDate?: string;
  category?: string;
  detail?: string;
}

/**
 * 할 일 상세보기/편집 모달.
 * 설명·카테고리·마감일·상세내용을 수정하거나, 완료 토글/삭제할 수 있다.
 */
export class TaskDetailModal extends Modal {
  private task: Task;
  private description: string;
  private dueDate: string;
  private category: string;
  private detail: string;

  private onSave: (changes: TaskChanges) => void;
  private onToggle: (completed: boolean) => void;
  private onDelete: () => void;
  private getCategories?: () => Promise<string[]>;

  constructor(
    app: App,
    task: Task,
    handlers: {
      onSave: (changes: TaskChanges) => void;
      onToggle: (completed: boolean) => void;
      onDelete: () => void;
      getCategories?: () => Promise<string[]>;
    }
  ) {
    super(app);
    this.task = task;
    this.description = task.description;
    this.dueDate = task.dueDate ?? "";
    this.category = task.category ?? "";
    this.detail = task.detail ?? "";
    this.onSave = handlers.onSave;
    this.onToggle = handlers.onToggle;
    this.onDelete = handlers.onDelete;
    this.getCategories = handlers.getCategories;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "할 일 상세" });

    new Setting(contentEl).setName("내용").addText((t) => {
      t.setValue(this.description).onChange((v) => (this.description = v));
    });

    new Setting(contentEl).setName("카테고리").addText((t) => {
      t.setPlaceholder("예: 업무, 장보기")
        .setValue(this.category)
        .onChange((v) => (this.category = v));
      this.attachCategorySuggestions(t.inputEl);
    });

    new Setting(contentEl).setName("마감일").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.dueDate).onChange((v) => (this.dueDate = v));
    });

    new Setting(contentEl).setName("상세내용").addTextArea((t) => {
      t.setValue(this.detail).onChange((v) => (this.detail = v));
      t.inputEl.rows = 6;
      t.inputEl.style.width = "100%";
    });

    if (this.task.createdDate) {
      contentEl.createEl("p", {
        text: `➕ 생성 ${this.task.createdDate}${
          this.task.completedDate ? `  ·  ✅ 완료 ${this.task.completedDate}` : ""
        }`,
        cls: "two-detail-meta",
      });
    }

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText(this.task.completed ? "완료 취소" : "완료 처리")
          .onClick(() => {
            this.close();
            this.onToggle(!this.task.completed);
          })
      )
      .addButton((b) =>
        b.setButtonText("삭제").setWarning().onClick(() => {
          this.close();
          this.onDelete();
        })
      )
      .addButton((b) =>
        b.setButtonText("저장").setCta().onClick(() => this.save())
      );
  }

  private async attachCategorySuggestions(input: HTMLInputElement): Promise<void> {
    if (!this.getCategories) return;
    const cats = await this.getCategories();
    if (!cats.length) return;
    const id = "two-cat-list-detail";
    const list = this.contentEl.createEl("datalist", { attr: { id } });
    cats.forEach((c) => list.createEl("option", { value: c }));
    input.setAttribute("list", id);
  }

  private save(): void {
    const description = this.description.trim();
    if (!description) return;
    this.close();
    this.onSave({
      description,
      dueDate: this.dueDate || undefined,
      category: this.category.trim() || undefined,
      detail: this.detail.trim() || undefined,
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
