<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BulkImportResultView from '@/features/importer/BulkImportResultView.vue';
import { buildHistoryDetailResultChartsPayload } from '@/features/importer/importer-chart-data';
import {
  downloadBulkImportArtifactsZipUrl,
  getBulkImportHistoryDetail,
} from '@/shared/api/client';
import type { BulkImportHistoryDetail, BulkImportJobStatus } from '@/shared/types';

const route = useRoute();
const router = useRouter();
const detail = ref<BulkImportHistoryDetail | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const exportError = ref<string | null>(null);
const exportingPackage = ref(false);
let loadRequestId = 0;

const jobId = computed(() => {
  const routeJobId = route.params.jobId;

  return Array.isArray(routeJobId) ? routeJobId[0] : routeJobId;
});
const resultChartsPayload = computed(() =>
  detail.value ? buildHistoryDetailResultChartsPayload(detail.value) : null
);
const resultLabel = computed(() => {
  if (!detail.value) {
    return 'Import result';
  }

  if (
    detail.value.job.status === 'completedWithErrors' ||
    detail.value.resultSummary.reviewItemRows > 0 ||
    detail.value.resultSummary.failedOrBlockedRows > 0
  ) {
    return 'Completed with review items';
  }

  if (detail.value.job.status === 'completed') {
    return 'Completed';
  }

  return formatStatusLabel(detail.value.job.status);
});
const resultTone = computed(() => {
  switch (detail.value?.job.status) {
    case 'completed':
      return 'success';
    case 'completedWithErrors':
    case 'validated':
    case 'readyToCommit':
      return 'warning';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'processing':
    case 'validating':
      return 'info';
    default:
      return 'neutral';
  }
});
const canExport = computed(
  () => Boolean(detail.value?.download.canDownloadResults && detail.value.download.artifactZipUrl)
);

watch(
  jobId,
  () => {
    void loadResultDetail();
  },
  { immediate: true }
);

async function loadResultDetail() {
  const currentJobId = jobId.value;
  const requestId = ++loadRequestId;

  if (!currentJobId) {
    loadError.value = 'No import job was selected.';
    return;
  }

  loading.value = true;
  loadError.value = null;
  exportError.value = null;

  try {
    const result = await getBulkImportHistoryDetail(currentJobId);

    if (requestId !== loadRequestId) {
      return;
    }

    detail.value = result;
  } catch (error) {
    if (requestId !== loadRequestId) {
      return;
    }

    detail.value = null;
    loadError.value = error instanceof Error ? error.message : 'Result detail could not be loaded.';
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

function backToHistory() {
  void router.push('/history');
}

function formatStatusLabel(status: BulkImportJobStatus): string {
  return status
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getResultPackageFileName() {
  const baseName = detail.value?.job.fileName?.replace(/\.[^/.]+$/, '') || jobId.value || 'import-result';
  const safeName = baseName.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${safeName || 'import-result'}-package.zip`;
}

async function downloadResultPackage() {
  const artifactZipUrl = detail.value?.download.artifactZipUrl;

  if (exportingPackage.value || !artifactZipUrl) {
    return;
  }

  exportError.value = null;
  exportingPackage.value = true;

  try {
    const blob = await downloadBulkImportArtifactsZipUrl(artifactZipUrl);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = getResultPackageFileName();
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url));
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'Export failed.';
  } finally {
    exportingPackage.value = false;
  }
}
</script>

<template>
  <section class="import-screen result-screen">
    <div v-if="loading" class="workflow-message">
      <strong>Loading result</strong>
      <span>Fetching the saved import summary.</span>
    </div>

    <div v-else-if="loadError" class="workflow-message error">
      <strong>Result unavailable</strong>
      <span>{{ loadError }}</span>
    </div>

    <BulkImportResultView
      v-else-if="resultChartsPayload && detail"
      :can-export="canExport"
      :export-error="exportError"
      :exporting="exportingPackage"
      :payload="resultChartsPayload"
      primary-action-label="Back to history"
      :status="detail.job.status"
      :status-label="resultLabel"
      title="History detail"
      :tone="resultTone"
      @export="downloadResultPackage"
      @primary-action="backToHistory"
    />
  </section>
</template>
