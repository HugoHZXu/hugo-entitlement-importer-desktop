import { createRouter, createWebHashHistory } from 'vue-router';

import HistoryPage from '@/pages/history/HistoryPage.vue';
import ImportProcessPage from '@/pages/import/ImportProcessPage.vue';
import ImportReviewPage from '@/pages/import/ImportReviewPage.vue';
import ImportUploadPage from '@/pages/import/ImportUploadPage.vue';
import SettingsPage from '@/pages/settings/SettingsPage.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/import/upload',
    },
    {
      path: '/import',
      name: 'import',
      redirect: '/import/upload',
    },
    {
      path: '/import/upload',
      name: 'import-upload',
      component: ImportUploadPage,
    },
    {
      path: '/import/review',
      name: 'import-review',
      component: ImportReviewPage,
    },
    {
      path: '/import/process',
      name: 'import-process',
      component: ImportProcessPage,
    },
    {
      path: '/import/result',
      name: 'import-result',
      component: () => import('@/pages/import/ImportResultPage.vue'),
    },
    {
      path: '/charts/review',
      name: 'charts-review',
      component: () => import('@/pages/charts/ChartWindowPage.vue'),
      meta: {
        layout: 'standalone',
      },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
    },
    {
      path: '/history/:jobId',
      name: 'history-detail',
      component: () => import('@/pages/history/HistoryDetailPage.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
    },
  ],
});
