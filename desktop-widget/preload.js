const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoAPI", {
  list: () => ipcRenderer.invoke("todos:list"),
  toggle: (task) => ipcRenderer.invoke("todos:toggle", task),
  add: (payload) => ipcRenderer.invoke("todos:add", payload),
  reorder: (category, orderedRaws) =>
    ipcRenderer.invoke("todos:reorder", { category, orderedRaws }),
  categories: () => ipcRenderer.invoke("todos:categories"),
  resize: (height) => ipcRenderer.send("window:resize", height),
  quit: () => ipcRenderer.invoke("app:quit"),
  onChanged: (cb) => ipcRenderer.on("todos:changed", cb),
});
