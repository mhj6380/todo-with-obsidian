const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoAPI", {
  list: () => ipcRenderer.invoke("todos:list"),
  toggle: (task) => ipcRenderer.invoke("todos:toggle", task),
  add: (payload) => ipcRenderer.invoke("todos:add", payload),
  quit: () => ipcRenderer.invoke("app:quit"),
  onChanged: (cb) => ipcRenderer.on("todos:changed", cb),
});
