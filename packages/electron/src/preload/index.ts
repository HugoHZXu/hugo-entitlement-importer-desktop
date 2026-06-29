import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
  getAppInfo: () =>
    ipcRenderer.invoke('desktop:get-app-info') as Promise<{
      appVersion: string;
      platform: string;
    }>,
  openReviewChartsWindow: (payload: unknown) =>
    ipcRenderer.invoke('desktop:open-review-charts-window', payload) as Promise<void>,
  updateReviewChartsWindow: (payload: unknown) => {
    ipcRenderer.send('desktop:update-review-charts-window', payload);
  },
  requestReviewChartsData: () => {
    ipcRenderer.send('desktop:request-review-charts-data');
  },
  onReviewChartsData: (callback: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);

    ipcRenderer.on('desktop:review-charts-data', listener);

    return () => {
      ipcRenderer.removeListener('desktop:review-charts-data', listener);
    };
  },
  onReviewChartsWindowClosed: (callback: () => void) => {
    const listener = () => callback();

    ipcRenderer.on('desktop:review-charts-window-closed', listener);

    return () => {
      ipcRenderer.removeListener('desktop:review-charts-window-closed', listener);
    };
  },
  openPath: (path: string) => ipcRenderer.invoke('desktop:open-path', path) as Promise<void>,
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke('desktop:show-item-in-folder', path) as Promise<void>,
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);
