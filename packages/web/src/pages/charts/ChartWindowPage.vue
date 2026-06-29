<script setup lang="ts">
import { ReviewImpactDashboard, type ReviewChartsPayload } from '@hugo-entitlement-importer/charts';
import { onMounted, onUnmounted, ref } from 'vue';

const payload = ref<ReviewChartsPayload | null>(null);
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
    <ReviewImpactDashboard :payload="payload" />
  </main>
</template>
