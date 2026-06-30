<script setup lang="ts">
import { ResultChartsDashboard } from '@hugo-entitlement-importer/charts';
import { Button, StatusBadge } from '@hugo-ui/shadcn-vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { buildResultChartsPayload } from '@/features/importer/importer-chart-data';
import { downloadBulkImportArtifactsZip } from '@/shared/api/client';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();
const exportError = ref<string | null>(null);
const exportingPackage = ref(false);

const resultChartsPayload = computed(() =>
  buildResultChartsPayload({
    rows: store.rows,
    fileName: store.importedFile?.name,
    entitlement: store.selectedEntitlement,
    jobId: store.selectedJobId,
  })
);
const hasReviewItems = computed(
  () =>
    resultChartsPayload.value.totals.failedRows > 0 ||
    resultChartsPayload.value.totals.skippedRows > 0
);
const resultLabel = computed(() =>
  hasReviewItems.value ? 'Completed with review items' : 'Completed'
);
const resultTone = computed(() => (hasReviewItems.value ? 'warning' : 'success'));

function resetAndStartAgain() {
  store.resetImport();
  void router.push('/import/upload');
}

function getResultPackageFileName() {
  const baseName =
    store.importedFile?.name?.replace(/\.[^/.]+$/, '') || store.selectedJobId || 'import-result';
  const safeName = baseName.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

  return `${safeName || 'import-result'}-package.zip`;
}

async function downloadResultPackage() {
  if (exportingPackage.value || !store.currentJob?.canDownloadResults) {
    return;
  }

  if (!store.selectedJobId) {
    exportError.value = 'No backend job is available for export.';
    return;
  }

  exportError.value = null;
  exportingPackage.value = true;

  try {
    const blob = await downloadBulkImportArtifactsZip(store.selectedJobId);
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
    <div class="result-layout">
      <header class="result-header">
        <div class="result-title">
          <StatusBadge
            :label="resultLabel"
            show-dot
            status="completed"
            :tone="resultTone"
          />
          <h1>Import result</h1>
        </div>
        <p class="result-file-name">{{ store.importedFile?.name ?? 'No file' }}</p>
        <div class="result-actions">
          <Button type="button" @click="resetAndStartAgain">Back home</Button>
        </div>
        <button
          class="result-export-link"
          type="button"
          @click="downloadResultPackage"
        >
          Export package (.zip)
        </button>
      </header>

      <div v-if="exportError" class="workflow-message error">
        <strong>Export failed</strong>
        <span>{{ exportError }}</span>
      </div>

      <ResultChartsDashboard :payload="resultChartsPayload" />
    </div>
  </section>
</template>
