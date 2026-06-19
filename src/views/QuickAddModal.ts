import { App, Modal, Setting } from "obsidian";

export interface QuickAddResult {
  description: string;
  dueDate?: string;
}

/**
 * 어디서든 단축키로 띄우는 빠른 추가 모달.
 * 설명 + (선택) 마감일을 받아 onSubmit 으로 넘긴다.
 */
export class QuickAddModal extends Modal {
  private description = "";
  private dueDate = "";
  private onSubmit: (result: QuickAddResult) => void;

  constructor(app: App, onSubmit: (result: QuickAddResult) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "할 일 추가" });

    let descInput: HTMLInputElement;

    new Setting(contentEl).setName("내용").addText((t) => {
      descInput = t.inputEl;
      t.setPlaceholder("무엇을 할까요?").onChange((v) => {
        this.description = v;
      });
      // Enter 로 바로 제출 (IME 조합 중에는 무시 — 한글 글자 깨짐 방지)
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) this.submit();
      });
    });

    new Setting(contentEl)
      .setName("마감일")
      .setDesc("선택 사항")
      .addText((t) => {
        t.inputEl.type = "date";
        t.onChange((v) => {
          this.dueDate = v;
        });
      });

    new Setting(contentEl).addButton((b) =>
      b
        .setButtonText("추가")
        .setCta()
        .onClick(() => this.submit())
    );

    // 모달 열리면 내용 입력에 포커스
    window.setTimeout(() => descInput?.focus(), 0);
  }

  private submit(): void {
    const description = this.description.trim();
    if (!description) return;
    this.close();
    this.onSubmit({
      description,
      dueDate: this.dueDate || undefined,
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
