// Electron 메인 프로세스: 투명·프레임리스·항상 최상단 위젯 창을 만들고
// 우측 상단에 고정한다. Inbox.md 를 읽고/쓰고, 외부(동기화) 변경을 감지한다.
const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
} = require("electron");
const fs = require("fs");
const path = require("path");
const { Store } = require("./lib/todo");

function loadConfig() {
  const def = {
    vaultPath: "",
    inboxPath: "Todos/Inbox.md",
    dailyFolder: "Daily",
    completedHeading: "## ✅ 완료한 일",
    logCompletions: true,
    window: { width: 320, height: 460, marginTop: 12, marginRight: 12 },
  };
  let user = {};
  try {
    user = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
  } catch (e) {
    /* 없으면 기본값 */
  }
  return Object.assign(def, user, {
    window: Object.assign(def.window, user.window || {}),
  });
}

const cfg = loadConfig();
const store = new Store(cfg);
let win = null;
let tray = null;

function showWindow() {
  if (!win || win.isDestroyed()) createWindow();
  anchorTopRight(win);
  win.show();
}
function hideWindow() {
  if (win && !win.isDestroyed()) win.hide();
}
function toggleWindow() {
  if (win && win.isVisible()) hideWindow();
  else showWindow();
}

// 우측 상단에 고정. height 를 주면 그 높이로, 없으면 현재 높이 유지.
function anchorTopRight(w, height, width) {
  const wa = screen.getPrimaryDisplay().workArea;
  const { marginTop, marginRight } = cfg.window;
  const ww = width || cfg.window.width;
  const maxH = wa.height - marginTop * 2;
  const h = Math.max(40, Math.min(Math.ceil(height || w.getBounds().height), maxH));
  w.setBounds({
    x: wa.x + wa.width - ww - marginRight,
    y: wa.y + marginTop,
    width: ww,
    height: h,
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: cfg.window.width,
    height: 140, // 콘텐츠에 맞춰 곧바로 자동 조절됨
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    fullscreenable: false,
    skipTaskbar: true,
    // vibrancy 제거 → 완전 투명 창. 카드만 CSS 프로스트로 뒤를 비춘다.
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 어떤 앱(전체화면 포함) 위에서도 최상단 유지
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  anchorTopRight(win);
  win.loadFile(path.join(__dirname, "index.html"));
  win.on("closed", () => (win = null));
}

function setupTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle("✓"); // 메뉴바에 텍스트 아이콘
  tray.setToolTip("Todo 위젯");
  const menu = Menu.buildFromTemplate([
    { label: "보이기/숨기기 (⌘⌥T)", click: toggleWindow },
    { type: "separator" },
    { label: "종료", click: () => app.quit() },
  ]);
  tray.on("click", toggleWindow); // 좌클릭 토글
  tray.on("right-click", () => tray.popUpContextMenu(menu));
}

// 이미 실행 중이면 새로 띄우지 말고 기존 창을 보이게 한다 (재실행 = 복귀)
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
}

app.whenReady().then(() => {
  if (app.dock) app.dock.hide(); // Dock 아이콘 없는 순수 위젯
  createWindow();
  setupTray();
  globalShortcut.register("CommandOrControl+Alt+T", toggleWindow);

  // Inbox 파일 외부 변경(동기화 등) 감지 → 렌더러 새로고침
  try {
    fs.watchFile(store.inboxFile(), { interval: 1000 }, () => {
      if (win && !win.isDestroyed()) win.webContents.send("todos:changed");
    });
  } catch (e) {
    /* 파일 없으면 무시 */
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
// 창을 숨겨도 앱은 트레이에 남는다 (window-all-closed 로 종료하지 않음)

ipcMain.handle("todos:list", () => store.readTasks());
ipcMain.handle("todos:toggle", (_e, t) => {
  store.toggleComplete(t);
  return store.readTasks();
});
ipcMain.handle("todos:add", (_e, p) => {
  store.addTask(p.description, p.category);
  return store.readTasks();
});
ipcMain.handle("todos:reorder", (_e, p) => {
  store.reorder(p.category, p.orderedRaws);
  return store.readTasks();
});
ipcMain.handle("todos:categories", () => store.categories());
ipcMain.handle("todos:move", (_e, p) => {
  store.moveTask(p.task, p.toCategory, p.beforeRaw);
  return store.readTasks();
});
ipcMain.handle("todos:moveCategory", (_e, p) => {
  store.moveCategory(p.name, p.beforeName);
  return store.readTasks();
});
ipcMain.handle("todos:delete", (_e, t) => {
  store.deleteTask(t);
  return store.readTasks();
});
ipcMain.handle("todos:updateDetail", (_e, p) => {
  store.updateDetail(p.task, p.detail);
  return store.readTasks();
});
ipcMain.handle("todos:setDue", (_e, p) => {
  store.setDue(p.task, p.dueDate);
  return store.readTasks();
});
ipcMain.on("app:hide", () => hideWindow());
ipcMain.on("window:resize", (_e, p) => {
  if (win && !win.isDestroyed()) anchorTopRight(win, p.height, p.width);
});
ipcMain.handle("app:quit", () => app.quit());
