import { App, Modal, Setting } from "obsidian";

export interface QuickAddResult {
  description: string;
  dueDate?: string;
  category?: string;
  detail?: string;
}

/**
 * 어디서든 단축키로 띄우는 빠른 추가 모달.
 * 설명 + (선택) 마감일/카테고리/상세를 받아 onSubmit 으로 넘긴다.
 */
export class QuickAddModal extends Modal {
  private description = "";
  private dueDate = "";
  private category = "";
  private detail = "";
  private onSubmit: (result: QuickAddResult) => void;
  private getCategories?: () => Promise<string[]>;

  constructor(
    app: App,
    onSubmit: (result: QuickAddResult) => void,
    getCategories?: () => Promise<string[]>
  ) {
    super(app);
    this.onSubmit = onSubmit;
    this.getCategories = getCategories;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "할 일 추가" });

    let descInput: HTMLInputElement;

    new Setting(contentEl).setName("내용").addText((t) => {
      descInput = t.inputEl;
      t.setPlaceholder("무엇을 할까요?").onChange((v) => (this.description = v));
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) this.submit();
      });
    });

    new Setting(contentEl).setName("카테고리").setDesc("선택 사항").addText((t) => {
      t.setPlaceholder("예: 업무, 장보기").onChange((v) => (this.category = v));
      this.attachCategorySuggestions(t.inputEl);
    });

    new Setting(contentEl)
      .setName("마감일")
      .setDesc("선택 사항")
      .addText((t) => {
        t.inputEl.type = "date";
        t.onChange((v) => (this.dueDate = v));
      });

    new Setting(contentEl)
      .setName("상세내용")
      .setDesc("선택 사항")
      .addTextArea((t) => {
        t.setPlaceholder("메모, 체크포인트 등…").onChange((v) => (this.detail = v));
        t.inputEl.rows = 4;
        t.inputEl.style.width = "100%";
      });

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("추가").setCta().onClick(() => this.submit())
    );

    window.setTimeout(() => descInput?.focus(), 0);
  }

  private async attachCategorySuggestions(input: HTMLInputElement): Promise<void> {
    if (!this.getCategories) return;
    const cats = await this.getCategories();
    if (!cats.length) return;
    const id = "two-cat-list";
    const list = this.contentEl.createEl("datalist", { attr: { id } });
    cats.forEach((c) => list.createEl("option", { value: c }));
    input.setAttribute("list", id);
  }

  private submit(): void {
    const description = this.description.trim();
    if (!description) return;
    this.close();
    this.onSubmit({
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
