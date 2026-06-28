const { app, BrowserWindow, screen, nativeTheme } = require('electron');
const path = require('path');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const defaultWidth = Math.min(1200, Math.floor(screenWidth * 0.9));
  const defaultHeight = Math.min(800, Math.floor(screenHeight * 0.9));

  let windowState = { width: defaultWidth, height: defaultHeight, maximized: false };
  const statePath = path.join(app.getPath('userData'), 'window-state.json');

  try {
    const savedState = require('fs').readFileSync(statePath, 'utf-8');
    windowState = { ...windowState, ...JSON.parse(savedState) };
  } catch (_) {}

  const win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth: 600,
    minHeight: 450,
    x: windowState.x,
    y: windowState.y,
    maximizable: true,
    fullscreenable: true,
    resizable: true,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#F7F5FF',
    show: false
  });

  if (windowState.maximized) {
    win.maximize();
  }

  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (!windowState.maximized) {
      win.center();
    }
  });

  const saveState = () => {
    try {
      const bounds = win.getBounds();
      const isMaximized = win.isMaximized();
      const state = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        maximized: isMaximized
      };
      require('fs').writeFileSync(statePath, JSON.stringify(state));
    } catch (_) {}
  };

  win.on('resize', saveState);
  win.on('move', saveState);
  win.on('maximize', saveState);
  win.on('unmaximize', saveState);

  nativeTheme.on('updated', () => {
    win.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors);
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});