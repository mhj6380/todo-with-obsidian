import { AbstractInputSuggest, App } from "obsidian";

/**
 * 텍스트 입력 아래에 카테고리 히스토리를 드롭다운으로 띄워 검색·선택하게 한다.
 * (Obsidian 네이티브 AbstractInputSuggest 사용)
 */
export class CategorySuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private items: string[]
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const q = query.toLowerCase().trim();
    const list = q
      ? this.items.filter((c) => c.toLowerCase().includes(q))
      : this.items.slice();
    return list.slice(0, 50);
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.inputEl.dispatchEvent(new Event("input")); // Setting.onChange 트리거
    this.setValue(value);
    this.close();
  }
}
