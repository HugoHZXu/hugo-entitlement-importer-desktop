<script setup lang="ts">
import { ResultChartsDashboard } from '@hugo-entitlement-importer/charts';
import { Button, StatusBadge } from '@hugo-ui/shadcn-vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { buildResultChartsPayload } from '@/features/importer/importer-chart-data';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();

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
          <Button type="button" @click="resetAndStartAgain">Import another CSV</Button>
        </div>
      </header>

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
