const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

// 初始化存储
const store = new Store();

// 创建主窗口
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, isDev ? '../public/favicon.ico' : 'favicon.ico'),
  });

  // 加载应用
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // 打开开发工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 设置菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新会话',
          accelerator: 'CmdOrCtrl+N',
          click() {
            mainWindow.webContents.send('new-session');
          },
        },
        { type: 'separator' },
        {
          label: '设置',
          accelerator: 'CmdOrCtrl+,',
          click() {
            mainWindow.webContents.send('open-settings');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click() {
            dialog.showMessageBox(mainWindow, {
              title: '关于',
              message: 'ChatGPT客户端应用',
              detail: '版本: 1.0.0\n基于Electron和React构建',
              buttons: ['确定'],
            });
          },
        },
        {
          label: '访问OpenAI官网',
          click() {
            shell.openExternal('https://openai.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 应用准备就绪时创建窗口
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在macOS上，点击dock图标时如果没有其它窗口打开则重新创建一个窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC通信事件处理
ipcMain.on('get-settings', (event) => {
  const settings = store.get('settings') || {
    apiKey: '',
    proxyUrl: '',
    model: 'gpt-3.5-turbo',
  };
  event.returnValue = settings;
});

ipcMain.on('save-settings', (event, settings) => {
  store.set('settings', settings);
  event.returnValue = true;
});

ipcMain.on('get-sessions', (event) => {
  const sessions = store.get('sessions') || [];
  event.returnValue = sessions;
});

ipcMain.on('save-sessions', (event, sessions) => {
  store.set('sessions', sessions);
  event.returnValue = true;
});