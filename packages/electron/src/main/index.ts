import { app, BrowserWindow, ipcMain, shell, type WebContents } from 'electron';
import { join } from 'node:path';

let reviewChartsWindow: BrowserWindow | null = null;
let reviewChartsOpener: WebContents | null = null;
let latestReviewChartsPayload: unknown = null;

function sendReviewChartsPayload(targetWebContents = reviewChartsWindow?.webContents) {
  if (!targetWebContents || targetWebContents.isDestroyed() || !latestReviewChartsPayload) {
    return;
  }

  targetWebContents.send('desktop:review-charts-data', latestReviewChartsPayload);
}

function getRendererIndexPath() {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'web', 'dist', 'index.html');
  }

  return join(__dirname, '../../../web/dist/index.html');
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
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

  mainWindow.maximize();

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(getRendererIndexPath());
  }
}

function createReviewChartsWindow() {
  if (reviewChartsWindow && !reviewChartsWindow.isDestroyed()) {
    reviewChartsWindow.focus();
    sendReviewChartsPayload();
    return;
  }

  reviewChartsWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    title: 'Import Charts',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  reviewChartsWindow.maximize();

  reviewChartsWindow.on('closed', () => {
    reviewChartsWindow = null;

    if (reviewChartsOpener && !reviewChartsOpener.isDestroyed()) {
      reviewChartsOpener.send('desktop:review-charts-window-closed');
    }

    reviewChartsOpener = null;
  });

  reviewChartsWindow.webContents.once('did-finish-load', () => {
    sendReviewChartsPayload();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void reviewChartsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/charts/review`);
  } else {
    void reviewChartsWindow.loadFile(getRendererIndexPath(), {
      hash: '/charts/review',
    });
  }
}

function registerIpcHandlers() {
  ipcMain.handle('desktop:get-app-info', () => ({
    appVersion: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle('desktop:open-review-charts-window', (event, payload: unknown) => {
    latestReviewChartsPayload = payload;
    reviewChartsOpener = event.sender;
    createReviewChartsWindow();
  });

  ipcMain.on('desktop:update-review-charts-window', (_event, payload: unknown) => {
    latestReviewChartsPayload = payload;
    sendReviewChartsPayload();
  });

  ipcMain.on('desktop:request-review-charts-data', (event) => {
    sendReviewChartsPayload(event.sender);
  });

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
