// ─────────────────────────────────────────────────────────────
// Obsidian Todo — Scriptable 잠금/홈 화면 위젯 (읽기 전용)
//
// 볼트의 Todos/Inbox.md 에서 "미완료(- [ ])" 할 일을 카테고리(## 헤딩)별로
// 읽어 위젯에 보여준다.
//
// [설치]
// 1) 앱스토어에서 Scriptable(무료) 설치
// 2) Scriptable 설정 → File Bookmarks → + → 볼트의 Todos/Inbox.md 선택
//    → 북마크 이름을 정확히  obsidian-inbox  로
// 3) Scriptable 에서 새 스크립트(ObsidianTodo)에 이 코드 붙여넣기
// 4) 홈/잠금화면 위젯 추가 → Scriptable → Script = ObsidianTodo
//
// [한계] iOS가 위젯 새로고침 주기를 통제(몇 분~15분). 완료/편집은 앱에서.
// ─────────────────────────────────────────────────────────────

const BOOKMARK = "obsidian-inbox";
const MAX_ITEMS = 6; // 홈화면 위젯 최대 표시 개수

function readInbox() {
  const fm = FileManager.iCloud();
  let p;
  try { p = fm.bookmarkedPath(BOOKMARK); } catch (e) { return null; }
  try {
    if (fm.isFileStoredIniCloud(p) && !fm.isFileDownloaded(p)) {
      fm.downloadFileFromiCloud(p);
    }
  } catch (e) {}
  try { return fm.readString(p); } catch (e) { return null; }
}

// 마크다운 → 미완료 할 일 (카테고리 포함)
function parseTodos(text) {
  const todos = [];
  let category = null;
  for (const line of text.split("\n")) {
    const h = line.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (h) { category = h[1].length >= 2 ? h[2].trim() : null; continue; }
    const m = line.match(/^\s*-\s*\[ \]\s+(.*\S)\s*$/);
    if (!m) continue;
    let body = m[1];
    let due = null;
    const dm = body.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (dm) due = dm[1];
    body = body.replace(/[➕📅✅⏳🔁]\s*\d{4}-\d{2}-\d{2}/g, "").replace(/\s+/g, " ").trim();
    todos.push({ body, due, category });
  }
  return todos;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function buildWidget(todos) {
  const family = config.widgetFamily || "medium";
  const isLock = family.startsWith("accessory");
  const w = new ListWidget();
  if (!isLock) w.setPadding(12, 14, 12, 14);

  const header = w.addText(`✓ 할 일 ${todos.length}`);
  header.font = Font.semiboldSystemFont(isLock ? 12 : 13);
  if (!isLock) header.textColor = Color.gray();
  w.addSpacer(isLock ? 2 : 6);

  const today = todayStr();
  const limit = isLock ? (family === "accessoryRectangular" ? 3 : 1) : MAX_ITEMS;

  if (todos.length === 0) {
    const t = w.addText("모두 완료 🎉");
    t.font = Font.systemFont(13);
    w.url = "obsidian://open";
    return w;
  }

  if (isLock) {
    // 잠금화면: 공간 작음 → 카테고리는 [태그] 접두로
    for (const todo of todos.slice(0, limit)) {
      const tag = todo.category ? `[${todo.category}] ` : "";
      const row = w.addText(`• ${tag}${todo.body}`);
      row.font = Font.systemFont(12);
      row.lineLimit = 1;
      w.addSpacer(1);
    }
  } else {
    // 홈화면: 카테고리별 그룹 (등장 순서)
    const order = [], groups = {};
    for (const t of todos) {
      const key = t.category || "미분류";
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(t);
    }
    let shown = 0;
    for (const key of order) {
      if (shown >= limit) break;
      const cat = w.addText(key);
      cat.font = Font.semiboldSystemFont(11);
      cat.textColor = Color.gray();
      w.addSpacer(2);
      for (const todo of groups[key]) {
        if (shown >= limit) break;
        const overdue = todo.due && todo.due < today;
        const row = w.addText(`• ${todo.body}`);
        row.font = Font.systemFont(13);
        row.lineLimit = 1;
        if (overdue) row.textColor = Color.red();
        w.addSpacer(2);
        shown++;
      }
      w.addSpacer(4);
    }
    if (todos.length > limit) {
      const more = w.addText(`+${todos.length - limit} 더`);
      more.font = Font.systemFont(11);
      more.textColor = Color.gray();
    }
  }

  w.url = "obsidian://open";
  return w;
}

const text = readInbox();
let widget;
if (text === null) {
  widget = new ListWidget();
  widget.addText("Inbox 못 읽음");
  const hint = widget.addText("Scriptable 설정 → File Bookmarks 확인");
  hint.font = Font.systemFont(10);
  hint.textColor = Color.gray();
} else {
  widget = buildWidget(parseTodos(text));
}

if (config.runsInWidget) Script.setWidget(widget);
else widget.presentMedium();
Script.complete();
