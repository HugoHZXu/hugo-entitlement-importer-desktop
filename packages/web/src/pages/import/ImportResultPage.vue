<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BulkImportResultView from '@/features/importer/BulkImportResultView.vue';
import { buildHistoryDetailResultChartsPayload } from '@/features/importer/importer-chart-data';
import {
  downloadBulkImportArtifactsZipUrl,
  getBulkImportHistoryDetail,
} from '@/shared/api/client';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';
import type { BulkImportHistoryDetail } from '@/shared/types';
import { createImporterChartDataCopy } from '@/shared/i18n/chart-copy';

const router = useRouter();
const { t } = useI18n();
const store = useImportWorkflowStore();
const detail = ref<BulkImportHistoryDetail | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const exportError = ref<string | null>(null);
const exportingPackage = ref(false);

const resultChartsPayload = computed(() =>
  detail.value
    ? buildHistoryDetailResultChartsPayload(
        detail.value,
        createImporterChartDataCopy((key, named) => t(key, named ?? {}))
      )
    : null
);
const hasReviewItems = computed(
  () =>
    (detail.value?.resultSummary.reviewItemRows ?? 0) > 0 ||
    (detail.value?.resultSummary.failedOrBlockedRows ?? 0) > 0
);
const resultLabel = computed(() =>
  hasReviewItems.value ? t('result.completedWithReviewItems') : t('result.completed')
);
const resultTone = computed(() => (hasReviewItems.value ? 'warning' : 'success'));
const canExport = computed(
  () => Boolean(detail.value?.download.canDownloadResults && detail.value.download.artifactZipUrl)
);

onMounted(() => {
  void loadResultDetail();
});

async function loadResultDetail() {
  if (!store.selectedJobId) {
    loadError.value = t('result.noBackendJob');
    return;
  }

  loading.value = true;
  loadError.value = null;

  try {
    detail.value = await getBulkImportHistoryDetail(store.selectedJobId);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : t('errors.resultDetailLoadFailed');
  } finally {
    loading.value = false;
  }
}

function resetAndStartAgain() {
  store.resetImport();
  void router.push('/import/upload');
}

function getResultPackageFileName() {
  const baseName =
    detail.value?.job.fileName?.replace(/\.[^/.]+$/, '') || store.selectedJobId || 'import-result';
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
      v-else-if="resultChartsPayload"
      :can-export="canExport"
      :export-error="exportError"
      :exporting="exportingPackage"
      :payload="resultChartsPayload"
      :primary-action-label="t('common.actions.backHome')"
      :status-label="resultLabel"
      :tone="resultTone"
      @export="downloadResultPackage"
      @primary-action="resetAndStartAgain"
    />
  </section>
</template>
