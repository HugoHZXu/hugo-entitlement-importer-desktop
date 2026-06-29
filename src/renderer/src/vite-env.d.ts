/// <reference types="vite/client" />

interface DesktopApi {
  getAppInfo(): Promise<{
    appVersion: string;
    platform: string;
  }>;
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
}

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}

export {};

