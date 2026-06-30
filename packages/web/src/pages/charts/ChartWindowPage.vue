<script setup lang="ts">
import { ReviewImpactDashboard, type ReviewChartsPayload } from '@hugo-entitlement-importer/charts';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { createReviewImpactDashboardCopy } from '@/shared/i18n/chart-copy';

const payload = ref<ReviewChartsPayload | null>(null);
const { t, locale } = useI18n();
const reviewChartsCopy = computed(() =>
  createReviewImpactDashboardCopy((key, named) => t(key, named ?? {}))
);
let cleanupReviewChartsData: (() => void) | null = null;

onMounted(() => {
  cleanupReviewChartsData = window.desktopApi.onReviewChartsData((nextPayload) => {
    payload.value = nextPayload;
  });
  window.desktopApi.requestReviewChartsData();
});

onUnmounted(() => {
  cleanupReviewChartsData?.();
});
</script>

<template>
  <main class="chart-window-page">
    <ReviewImpactDashboard :payload="payload" :copy="reviewChartsCopy" :locale="locale" />
  </main>
</template>
