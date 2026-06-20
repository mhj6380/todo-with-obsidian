const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("todoAPI", {
  list: () => ipcRenderer.invoke("todos:list"),
  toggle: (task) => ipcRenderer.invoke("todos:toggle", task),
  add: (payload) => ipcRenderer.invoke("todos:add", payload),
  reorder: (category, orderedRaws) =>
    ipcRenderer.invoke("todos:reorder", { category, orderedRaws }),
  categories: () => ipcRenderer.invoke("todos:categories"),
  move: (task, toCategory, beforeRaw) =>
    ipcRenderer.invoke("todos:move", { task, toCategory, beforeRaw }),
  moveCategory: (name, beforeName) =>
    ipcRenderer.invoke("todos:moveCategory", { name, beforeName }),
  delete: (task) => ipcRenderer.invoke("todos:delete", task),
  updateDetail: (task, detail) =>
    ipcRenderer.invoke("todos:updateDetail", { task, detail }),
  setDue: (task, dueDate) => ipcRenderer.invoke("todos:setDue", { task, dueDate }),
  resize: (height, width) => ipcRenderer.send("window:resize", { height, width }),
  hide: () => ipcRenderer.send("app:hide"),
  quit: () => ipcRenderer.invoke("app:quit"),
  onChanged: (cb) => ipcRenderer.on("todos:changed", cb),
});
