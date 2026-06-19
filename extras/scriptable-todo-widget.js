// ─────────────────────────────────────────────────────────────
// Obsidian Todo — Scriptable 잠금/홈 화면 위젯
//
// 볼트의 Todos/Inbox.md 에서 "미완료(- [ ])" 할 일을 읽어
// 아이폰 잠금화면·홈화면 위젯에 보여준다.
//
// [설치]
// 1) 앱스토어에서 Scriptable(무료) 설치
// 2) Scriptable 앱 설정(Settings) → "File Bookmarks" → +
//    → Files 앱에서 볼트의  Todos/Inbox.md  파일을 선택
//    → 북마크 이름을 정확히  obsidian-inbox  로 지정
// 3) Scriptable 에서 새 스크립트 만들고 이 코드를 붙여넣기 (이름: ObsidianTodo)
// 4) 홈/잠금화면 길게 누르기 → 위젯 추가 → Scriptable →
//    위젯 편집에서 Script = ObsidianTodo 선택
//
// [한계] iOS가 위젯 새로고침 주기를 통제하므로 즉시 반영은 아니고
//        보통 몇 분~15분 간격으로 갱신된다. (탭하면 Obsidian 열림)
// ─────────────────────────────────────────────────────────────

const BOOKMARK = "obsidian-inbox"; // 위 2)에서 정한 북마크 이름
const MAX_ITEMS = 6; // 홈화면 위젯에 표시할 최대 개수

// ---- Inbox.md 읽기 (북마크 경유) ----
function readInbox() {
  const fm = FileManager.iCloud();
  let path;
  try {
    path = fm.bookmarkedPath(BOOKMARK);
  } catch (e) {
    return null; // 북마크 미설정
  }
  try {
    if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
      // 동기화로 아직 안 내려온 경우 다운로드 트리거 (best-effort)
      fm.downloadFileFromiCloud(path);
    }
  } catch (e) {
    /* 로컬 파일이면 무시 */
  }
  try {
    return fm.readString(path);
  } catch (e) {
    return null;
  }
}

// ---- 마크다운 → 미완료 할 일 목록 ----
function parseTodos(text) {
  const todos = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*-\s*\[ \]\s+(.*\S)\s*$/);
    if (!m) continue;
    let body = m[1];
    let due = null;
    const dm = body.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (dm) due = dm[1];
    // 이모지 메타(➕/📅/✅ + 날짜) 제거 → 깔끔한 본문
    body = body
      .replace(/[➕📅✅⏳🔁]\s*\d{4}-\d{2}-\d{2}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    todos.push({ body, due });
  }
  return todos;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---- 위젯 그리기 ----
function buildWidget(todos) {
  const family = config.widgetFamily || "medium";
  const isLock = family.startsWith("accessory");
  const w = new ListWidget();
  if (!isLock) w.setPadding(12, 14, 12, 14);

  const header = w.addText(`✓ 할 일 ${todos.length}`);
  header.font = isLock
    ? Font.semiboldSystemFont(12)
    : Font.semiboldSystemFont(13);
  if (!isLock) header.textColor = Color.gray();
  w.addSpacer(isLock ? 2 : 6);

  const today = todayStr();
  const limit = isLock ? (family === "accessoryRectangular" ? 3 : 1) : MAX_ITEMS;

  if (todos.length === 0) {
    const t = w.addText("모두 완료 🎉");
    t.font = Font.systemFont(13);
  } else {
    for (const todo of todos.slice(0, limit)) {
      const overdue = todo.due && todo.due < today;
      const row = w.addText(`• ${todo.body}`);
      row.font = Font.systemFont(isLock ? 12 : 13);
      row.lineLimit = 1;
      if (overdue && !isLock) row.textColor = Color.red();
      w.addSpacer(isLock ? 1 : 3);
    }
    if (todos.length > limit) {
      const more = w.addText(`+${todos.length - limit} 더`);
      more.font = Font.systemFont(isLock ? 11 : 12);
      if (!isLock) more.textColor = Color.gray();
    }
  }

  w.url = "obsidian://open"; // 위젯 탭 → Obsidian 열기
  return w;
}

// ---- 실행 ----
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

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium(); // 앱에서 실행하면 미리보기
}
Script.complete();
