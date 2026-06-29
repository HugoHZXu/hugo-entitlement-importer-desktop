import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
  getAppInfo: () =>
    ipcRenderer.invoke('desktop:get-app-info') as Promise<{
      appVersion: string;
      platform: string;
    }>,
  openPath: (path: string) => ipcRenderer.invoke('desktop:open-path', path) as Promise<void>,
  showItemInFolder: (path: string) =>
    ipcRenderer.invoke('desktop:show-item-in-folder', path) as Promise<void>,
};

contextBridge.exposeInMainWorld('desktopApi', desktopApi);

