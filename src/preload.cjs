const { contextBridge, ipcRenderer } = require('electron');
const listen = (channel, callback) => {
  const handler = (_event, data) => callback(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
contextBridge.exposeInMainWorld('triangle', {
  bootstrap: () => ipcRenderer.invoke('bootstrap'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  createSession: (input) => ipcRenderer.invoke('session:create', input),
  attachSession: (id) => ipcRenderer.invoke('session:attach', id),
  write: (id, data) => ipcRenderer.invoke('session:write', id, data),
  submit: (id, text) => ipcRenderer.invoke('session:submit', id, text),
  resize: (id, cols, rows) => ipcRenderer.invoke('session:resize', id, cols, rows),
  closeSession: (id) => ipcRenderer.invoke('session:close', id),
  onData: (callback) => listen('session:data', callback),
  onExit: (callback) => listen('session:exit', callback),
  stats: () => ipcRenderer.invoke('system:stats'),
  usage: (provider) => ipcRenderer.invoke('usage:status', provider),
  importFont: () => ipcRenderer.invoke('font:import'),
  openUsage: (provider) => ipcRenderer.invoke('usage:open', provider),
  copy: (text) => ipcRenderer.invoke('clipboard:write', text),
  paste: () => ipcRenderer.invoke('clipboard:read'),
  saveTranscript: (text) => ipcRenderer.invoke('transcript:save', text),
});
