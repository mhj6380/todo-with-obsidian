// Obsidian Todo 위젯 — 파일 입출력/파싱/직렬화.
// 플러그인(src/model/*, src/services/*)과 동일한 포맷을 미러링한다:
//  - 카테고리 = `## 헤딩` 섹션
//  - 상세내용 = 할 일 줄 아래 들여쓰기 블록
const fs = require("fs");
const path = require("path");

const EMOJI = { created: "➕", due: "📅", done: "✅" };
const TASK_LINE = /^(\s*)- \[( |x|X)\]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const INDENTED = /^(?:\t| {2,})(.*)$/;
const HEADING_RE = /^#{1,6}\s+/;
const INDENT_RE = /^(?:\t| {2,})/;
const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const reCreated = new RegExp(EMOJI.created + "\\s*" + DATE);
const reDue = new RegExp(EMOJI.due + "\\s*" + DATE);
const reDone = new RegExp(EMOJI.done + "\\s*" + DATE);

const pad = (n) => (n < 10 ? "0" + n : "" + n);
const today = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function isTaskLine(line) {
  return TASK_LINE.test(line);
}

function parseLine(line) {
  const m = line.match(TASK_LINE);
  if (!m) return null;
  const checkmark = m[2];
  const body = m[3];
  const createdDate = (body.match(reCreated) || [])[1];
  const dueDate = (body.match(reDue) || [])[1];
  const completedDate = (body.match(reDone) || [])[1];
  const description = body
    .replace(reCreated, "")
    .replace(reDue, "")
    .replace(reDone, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    description,
    completed: checkmark.toLowerCase() === "x",
    createdDate,
    dueDate,
    completedDate,
    raw: line,
  };
}

function serialize(t) {
  const box = t.completed ? "x" : " ";
  const parts = [`- [${box}] ${t.description}`];
  if (t.createdDate) parts.push(`${EMOJI.created} ${t.createdDate}`);
  if (t.dueDate) parts.push(`${EMOJI.due} ${t.dueDate}`);
  if (t.completed && t.completedDate) parts.push(`${EMOJI.done} ${t.completedDate}`);
  return parts.join(" ");
}

function serializeBlock(t, indent = "    ") {
  let out = serialize(t);
  if (t.detail && t.detail.trim()) {
    out +=
      "\n" +
      t.detail
        .replace(/\s+$/, "")
        .split("\n")
        .map((l) => indent + l)
        .join("\n");
  }
  return out;
}

function parseDocument(content) {
  const lines = content.split("\n");
  const tasks = [];
  let category = null;
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEADING);
    if (h) {
      category = h[1].length >= 2 ? h[2].trim() : null;
      continue;
    }
    const task = parseLine(lines[i]);
    if (!task) continue;
    const detailLines = [];
    let j = i + 1;
    while (j < lines.length && !isTaskLine(lines[j])) {
      const m = lines[j].match(INDENTED);
      if (!m) break;
      detailLines.push(m[1]);
      j++;
    }
    task.category = category;
    task.detail = detailLines.length ? detailLines.join("\n") : undefined;
    task.start = i;
    task.end = j;
    tasks.push(task);
    i = j - 1;
  }
  return tasks;
}

function insertBlock(data, block, category) {
  if (!category) {
    const trimmed = data.replace(/\s*$/, "");
    return `${trimmed}\n${block}\n`;
  }
  const heading = `## ${category}`;
  const lines = data.split("\n");
  const hIdx = lines.findIndex((l) => l.trim() === heading);
  if (hIdx === -1) {
    const trimmed = data.replace(/\s*$/, "");
    return `${trimmed}\n\n${heading}\n${block}\n`;
  }
  let insertAt = lines.length;
  for (let i = hIdx + 1; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i])) {
      insertAt = i;
      break;
    }
  }
  while (insertAt > hIdx + 1 && lines[insertAt - 1].trim() === "") insertAt--;
  lines.splice(insertAt, 0, block);
  return lines.join("\n");
}

class Store {
  constructor(cfg) {
    this.cfg = cfg;
  }
  inboxFile() {
    return path.join(this.cfg.vaultPath, this.cfg.inboxPath);
  }
  dailyFile() {
    return path.join(this.cfg.vaultPath, this.cfg.dailyFolder, `${today()}.md`);
  }
  readRaw() {
    try {
      return fs.readFileSync(this.inboxFile(), "utf8");
    } catch (e) {
      return "";
    }
  }

  readTasks() {
    return parseDocument(this.readRaw());
  }

  categories() {
    const seen = [];
    for (const t of this.readTasks()) {
      if (t.category && !seen.includes(t.category)) seen.push(t.category);
    }
    return seen;
  }

  addTask(description, category) {
    description = (description || "").trim();
    if (!description) return;
    const task = {
      description,
      completed: false,
      createdDate: today(),
      category: (category || "").trim() || undefined,
    };
    const block = serializeBlock(task);
    let data = this.readRaw();
    if (!data) data = "# Todos\n\n";
    this._write(this.inboxFile(), insertBlock(data, block, task.category));
  }

  toggleComplete(target) {
    const lines = this.readRaw().split("\n");
    let hit = -1;
    if (target && target.raw) hit = lines.findIndex((l) => l === target.raw);
    if (hit === -1 && target && target.description) {
      hit = lines.findIndex((l) => {
        const t = parseLine(l);
        return t && !t.completed && t.description === target.description;
      });
    }
    if (hit === -1) return;
    const t = parseLine(lines[hit]);
    if (!t || t.completed) return;
    t.completed = true;
    t.completedDate = today();
    t.dueDate = (target && target.dueDate) || t.dueDate;
    lines[hit] = serialize(t);
    this._write(this.inboxFile(), lines.join("\n"));
    if (this.cfg.logCompletions) this._logCompletion(t);
  }

  /** 할 일의 마감일 설정/변경/해제 (date 가 빈 값이면 제거). 상세는 보존. */
  setDue(target, date) {
    const lines = this.readRaw().split("\n");
    let hit = -1;
    if (target && target.raw) hit = lines.findIndex((l) => l === target.raw);
    if (hit === -1 && target && target.description) {
      hit = lines.findIndex((l) => {
        const t = parseLine(l);
        return t && t.description === target.description;
      });
    }
    if (hit === -1) return;
    const t = parseLine(lines[hit]);
    if (!t) return;
    t.dueDate = date ? date : undefined;
    lines[hit] = serialize(t);
    this._write(this.inboxFile(), lines.join("\n"));
  }

  /** 한 카테고리 안의 "미완료" 할 일 블록 순서를 재배치 (상세 블록 포함 이동) */
  reorder(category, orderedRaws) {
    const cat = category || null;
    const data = this.readRaw();
    const lines = data.split("\n");
    const tasks = parseDocument(data).filter(
      (t) => (t.category || null) === cat && !t.completed
    );
    if (tasks.length !== orderedRaws.length) return; // 그새 바뀌면 중단
    const byRaw = new Map(
      tasks.map((t) => [t.raw, lines.slice(t.start, t.end).join("\n")])
    );
    const insertAt = Math.min(...tasks.map((t) => t.start));
    // 아래에서 위로 제거(인덱스 안 깨지게)
    tasks
      .slice()
      .sort((a, b) => b.start - a.start)
      .forEach((t) => lines.splice(t.start, t.end - t.start));
    const blocks = orderedRaws.map((r) => byRaw.get(r)).filter((x) => x != null);
    lines.splice(insertAt, 0, blocks.join("\n"));
    this._write(this.inboxFile(), lines.join("\n"));
  }

  /**
   * 할 일을 이동한다(상세 블록째). 같은 카테고리면 순서 변경, 다른 카테고리면
   * 카테고리 이동. beforeRaw 가 있으면 그 할 일 바로 앞에, 없으면 카테고리 끝에.
   */
  moveTask(target, toCategory, beforeRaw) {
    const cat = toCategory || null;
    let lines = this.readRaw().split("\n");
    const all = parseDocument(lines.join("\n"));
    const src =
      (target && target.raw && all.find((t) => t.raw === target.raw)) ||
      all.find((t) => target && t.description === target.description);
    if (!src) return;
    const blockText = lines.slice(src.start, src.end).join("\n");
    lines.splice(src.start, src.end - src.start);
    let data = lines.join("\n");

    if (beforeRaw) {
      const after = parseDocument(data).find((t) => t.raw === beforeRaw);
      if (after) {
        const l2 = data.split("\n");
        l2.splice(after.start, 0, blockText);
        this._write(this.inboxFile(), l2.join("\n"));
        return;
      }
    }
    this._write(this.inboxFile(), insertBlock(data, blockText, cat));
  }

  /** 할 일(상세 블록 포함) 삭제 */
  deleteTask(target) {
    const lines = this.readRaw().split("\n");
    const all = parseDocument(lines.join("\n"));
    const src =
      (target && target.raw && all.find((t) => t.raw === target.raw)) ||
      all.find((t) => target && t.description === target.description);
    if (!src) return;
    lines.splice(src.start, src.end - src.start);
    this._write(this.inboxFile(), lines.join("\n"));
  }

  /** 카테고리(## 섹션 전체)를 beforeName 앞으로 이동. 없으면 맨 끝. */
  moveCategory(name, beforeName) {
    const lines = this.readRaw().split("\n");
    const sectionOf = (nm) => {
      const h = lines.findIndex((l) => l.trim() === `## ${nm}`);
      if (h === -1) return null;
      let end = lines.length;
      for (let i = h + 1; i < lines.length; i++) {
        if (HEADING_RE.test(lines[i])) { end = i; break; }
      }
      return { start: h, end };
    };
    const sec = sectionOf(name);
    if (!sec) return;
    const block = lines.slice(sec.start, sec.end);
    lines.splice(sec.start, sec.end - sec.start);
    let insertAt = lines.length;
    if (beforeName) {
      const b = lines.findIndex((l) => l.trim() === `## ${beforeName}`);
      if (b !== -1) insertAt = b;
    }
    lines.splice(insertAt, 0, ...block);
    this._write(this.inboxFile(), lines.join("\n"));
  }

  _logCompletion(task) {
    const line = `- [x] ${task.description} (${nowTime()}) ✅ ${today()}`;
    const file = this.dailyFile();
    let data;
    try {
      data = fs.readFileSync(file, "utf8");
    } catch (e) {
      data = `# ${today()}\n`;
    }
    const heading = this.cfg.completedHeading.trim();
    const lines = data.split("\n");
    const hIdx = lines.findIndex((l) => l.trim() === heading);
    if (hIdx === -1) {
      data = `${data.replace(/\s*$/, "")}\n\n${heading}\n${line}\n`;
    } else {
      let insertAt = lines.length;
      for (let i = hIdx + 1; i < lines.length; i++) {
        if (HEADING_RE.test(lines[i])) {
          insertAt = i;
          break;
        }
      }
      while (insertAt > hIdx + 1 && lines[insertAt - 1].trim() === "") insertAt--;
      lines.splice(insertAt, 0, line);
      data = lines.join("\n");
    }
    this._write(file, data);
  }

  _write(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data, "utf8");
  }
}

module.exports = { Store, parseDocument, serialize, serializeBlock, today };
