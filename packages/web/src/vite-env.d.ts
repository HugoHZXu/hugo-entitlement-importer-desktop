/// <reference types="vite/client" />

import type { ReviewChartsPayload } from '@hugo-entitlement-importer/charts';

interface DesktopApi {
  getAppInfo(): Promise<{
    appVersion: string;
    platform: string;
  }>;
  openReviewChartsWindow(payload: ReviewChartsPayload): Promise<void>;
  updateReviewChartsWindow(payload: ReviewChartsPayload): void;
  requestReviewChartsData(): void;
  onReviewChartsData(callback: (payload: ReviewChartsPayload) => void): () => void;
  onReviewChartsWindowClosed(callback: () => void): () => void;
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
}

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}

export {};
