const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoAPI", {
  list: () => ipcRenderer.invoke("todos:list"),
  toggle: (task) => ipcRenderer.invoke("todos:toggle", task),
  add: (payload) => ipcRenderer.invoke("todos:add", payload),
  reorder: (orderedRaws) => ipcRenderer.invoke("todos:reorder", orderedRaws),
  resize: (height) => ipcRenderer.send("window:resize", height),
  quit: () => ipcRenderer.invoke("app:quit"),
  onChanged: (cb) => ipcRenderer.on("todos:changed", cb),
});
