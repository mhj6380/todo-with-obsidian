// Obsidian Todo 위젯 — 파일 입출력/파싱/직렬화.
// 플러그인(src/model/*, src/services/*)과 동일한 포맷을 그대로 미러링한다.
const fs = require("fs");
const path = require("path");

const EMOJI = { created: "➕", due: "📅", done: "✅" };
const TASK_LINE = /^(\s*)- \[( |x|X)\]\s+(.*)$/;
const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const reCreated = new RegExp(EMOJI.created + "\\s*" + DATE);
const reDue = new RegExp(EMOJI.due + "\\s*" + DATE);
const reDone = new RegExp(EMOJI.done + "\\s*" + DATE);

const pad = (n) => (n < 10 ? "0" + n : "" + n);
const today = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isOverdue = (due, ref = today()) => (due ? due < ref : false);

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

  /** 미완료/완료 전체 Task 배열 (줄 순서 유지) */
  readTasks() {
    return this.readRaw()
      .split("\n")
      .map(parseLine)
      .filter(Boolean);
  }

  /** Inbox 끝에 새 할 일 추가 */
  addTask(description, dueDate) {
    description = (description || "").trim();
    if (!description) return;
    const line = serialize({
      description,
      completed: false,
      createdDate: today(),
      dueDate: dueDate || undefined,
    });
    let data = this.readRaw();
    if (!data) data = "# Todos\n\n";
    const trimmed = data.replace(/\s*$/, "");
    this._write(this.inboxFile(), `${trimmed}\n${line}\n`);
  }

  /**
   * 할 일을 완료 처리한다. raw 줄로 먼저 찾고, 없으면 설명으로 찾는다.
   * 완료 후 Daily Note 에도 기록(플러그인과 동일).
   */
  toggleComplete(target) {
    const lines = this.readRaw().split("\n");
    const wantRaw = target && target.raw;
    const wantDesc = target && target.description;
    let hit = -1;
    if (wantRaw) hit = lines.findIndex((l) => l === wantRaw);
    if (hit === -1 && wantDesc) {
      hit = lines.findIndex((l) => {
        const t = parseLine(l);
        return t && !t.completed && t.description === wantDesc;
      });
    }
    if (hit === -1) return;
    const t = parseLine(lines[hit]);
    if (!t || t.completed) return;
    t.completed = true;
    t.completedDate = today();
    lines[hit] = serialize(t);
    this._write(this.inboxFile(), lines.join("\n"));
    if (this.cfg.logCompletions) {
      this._logCompletion(t);
    }
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
      const trimmed = data.replace(/\s*$/, "");
      data = `${trimmed}\n\n${heading}\n${line}\n`;
    } else {
      let insertAt = lines.length;
      for (let i = hIdx + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) {
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

module.exports = { Store, parseLine, serialize, today, nowTime, isOverdue };
