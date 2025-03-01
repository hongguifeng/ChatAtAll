const { ipcRenderer } = window.require('electron');

export const saveSettings = (settings) => {
  return ipcRenderer.sendSync('save-settings', settings);
};

export const getSettings = () => {
  return ipcRenderer.sendSync('get-settings');
};

export const saveSessions = (sessions) => {
  return ipcRenderer.sendSync('save-sessions', sessions);
};

export const getSessions = () => {
  return ipcRenderer.sendSync('get-sessions');
};