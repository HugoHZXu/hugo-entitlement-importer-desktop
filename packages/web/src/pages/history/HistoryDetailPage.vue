<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import BulkImportResultView from '@/features/importer/BulkImportResultView.vue';
import { buildHistoryDetailResultChartsPayload } from '@/features/importer/importer-chart-data';
import {
  downloadBulkImportArtifactsZipUrl,
  getBulkImportHistoryDetail,
} from '@/shared/api/client';
import { createImporterChartDataCopy } from '@/shared/i18n/chart-copy';
import type { BulkImportHistoryDetail, BulkImportJobStatus } from '@/shared/types';

const route = useRoute();
const router = useRouter();
const { t, te } = useI18n();
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
  detail.value
    ? buildHistoryDetailResultChartsPayload(
        detail.value,
        createImporterChartDataCopy((key, named) => t(key, named ?? {}))
      )
    : null
);
const resultLabel = computed(() => {
  if (!detail.value) {
    return t('result.importResult');
  }

  if (
    detail.value.job.status === 'completedWithErrors' ||
    detail.value.resultSummary.reviewItemRows > 0 ||
    detail.value.resultSummary.failedOrBlockedRows > 0
  ) {
    return t('result.completedWithReviewItems');
  }

  if (detail.value.job.status === 'completed') {
    return t('result.completed');
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
    loadError.value = t('result.noImportJobSelected');
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
    loadError.value = error instanceof Error ? error.message : t('errors.resultDetailLoadFailed');
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
  const key = `common.status.${status}`;

  return te(key)
    ? t(key)
    : status.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
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
    exportError.value = error instanceof Error ? error.message : t('errors.exportFailed');
  } finally {
    exportingPackage.value = false;
  }
}
</script>

<template>
  <section class="import-screen result-screen">
    <div v-if="loading" class="workflow-message">
      <strong>{{ t('result.loadingTitle') }}</strong>
      <span>{{ t('result.loadingDescription') }}</span>
    </div>

    <div v-else-if="loadError" class="workflow-message error">
      <strong>{{ t('result.resultUnavailable') }}</strong>
      <span>{{ loadError }}</span>
    </div>

    <BulkImportResultView
      v-else-if="resultChartsPayload && detail"
      :can-export="canExport"
      :export-error="exportError"
      :exporting="exportingPackage"
      :payload="resultChartsPayload"
      :primary-action-label="t('common.actions.backToHistory')"
      :status="detail.job.status"
      :status-label="resultLabel"
      :title="t('result.historyDetail')"
      :tone="resultTone"
      @export="downloadResultPackage"
      @primary-action="backToHistory"
    />
  </section>
</template>
