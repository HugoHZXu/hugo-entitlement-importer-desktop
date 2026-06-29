<script setup lang="ts">
import { ResultChartsDashboard } from '@hugo-entitlement-importer/charts';
import { Button, StatusBadge } from '@hugo-ui/shadcn-vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { buildResultChartsPayload } from '@/features/importer/importer-chart-data';
import { downloadBulkImportArtifact } from '@/shared/api/client';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';
import type { BulkImportResultArtifact } from '@/shared/types';

const router = useRouter();
const store = useImportWorkflowStore();
const downloadError = ref<string | null>(null);

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

async function downloadArtifact(artifact: BulkImportResultArtifact) {
  if (!store.selectedJobId) {
    downloadError.value = 'No backend job is available for download.';
    return;
  }

  downloadError.value = null;

  try {
    const content = await downloadBulkImportArtifact({
      artifact,
      jobId: store.selectedJobId,
    });
    const blob = new Blob([content], {
      type: artifact === 'report' ? 'text/markdown;charset=utf-8' : 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download =
      artifact === 'report' ? `${store.selectedJobId}-report.md` : `${store.selectedJobId}-${artifact}`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    downloadError.value = error instanceof Error ? error.message : 'Download failed.';
  }
}
</script>

<template>
  <section class="import-screen result-screen">
    <div class="result-layout">
      <header class="result-header">
        <div>
          <StatusBadge
            :label="resultLabel"
            show-dot
            status="completed"
            :tone="resultTone"
          />
          <h1>Import result</h1>
          <p>{{ store.importedFile?.name ?? 'No file' }}</p>
        </div>
        <div class="result-actions">
          <Button variant="outline" tone="neutral" type="button" @click="router.push('/import/review')">
            Back to rows
          </Button>
          <Button
            variant="outline"
            tone="neutral"
            type="button"
            :disabled="!store.currentJob?.canDownloadResults"
            @click="downloadArtifact('report')"
          >
            Report
          </Button>
          <Button
            variant="outline"
            tone="neutral"
            type="button"
            :disabled="!store.currentJob?.canDownloadResults"
            @click="downloadArtifact('success.csv')"
          >
            Success CSV
          </Button>
          <Button
            variant="outline"
            tone="neutral"
            type="button"
            :disabled="!store.currentJob?.canDownloadResults"
            @click="downloadArtifact('failed.csv')"
          >
            Failed CSV
          </Button>
          <Button type="button" @click="resetAndStartAgain">Import another CSV</Button>
        </div>
      </header>

      <div v-if="downloadError" class="workflow-message error">
        <strong>Download failed</strong>
        <span>{{ downloadError }}</span>
      </div>

      <ResultChartsDashboard :payload="resultChartsPayload" />

      <dl class="result-details">
        <div>
          <dt>Job</dt>
          <dd>{{ store.selectedJobId ?? 'Not created' }}</dd>
        </div>
        <div>
          <dt>Source file</dt>
          <dd>{{ store.importedFile?.name ?? 'No file' }}</dd>
        </div>
        <div>
          <dt>Workspace</dt>
          <dd>Workspace export will be connected in the desktop file task.</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
