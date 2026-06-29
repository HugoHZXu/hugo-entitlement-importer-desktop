import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'Hugo Entitlement Importer',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function registerIpcHandlers() {
  ipcMain.handle('desktop:get-app-info', () => ({
    appVersion: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle('desktop:open-path', async (_event, targetPath: string) => {
    const errorMessage = await shell.openPath(targetPath);

    if (errorMessage) {
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('desktop:show-item-in-folder', (_event, targetPath: string) => {
    shell.showItemInFolder(targetPath);
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
