<script setup lang="ts">
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MetricTile,
  StatusBadge,
} from '@hugo-ui/shadcn-vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();

const resultLabel = computed(() =>
  store.resultSummary.failedRows > 0 || store.resultSummary.skippedRows > 0
    ? 'Completed with review items'
    : 'Completed'
);
const resultTone = computed(() =>
  store.resultSummary.failedRows > 0 || store.resultSummary.skippedRows > 0 ? 'warning' : 'success'
);

function resetAndStartAgain() {
  store.resetImport();
  void router.push('/import/upload');
}
</script>

<template>
  <section class="import-screen result-screen">
    <Card class="result-card">
      <CardHeader>
        <StatusBadge
          :label="resultLabel"
          show-dot
          status="completed"
          :tone="resultTone"
        />
        <CardTitle>Import result</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="metric-grid result-grid">
          <MetricTile
            compact
            label="Success rows"
            :value="store.resultSummary.successRows"
            description="Committed"
            tone="success"
          />
          <MetricTile
            compact
            label="Skipped rows"
            :value="store.resultSummary.skippedRows"
            description="Warnings or deleted"
            tone="warning"
          />
          <MetricTile
            compact
            label="Failed rows"
            :value="store.resultSummary.failedRows"
            description="Blocked"
            tone="danger"
          />
          <MetricTile
            compact
            label="Processed rows"
            :value="store.resultSummary.processedRows"
            description="Active rows"
          />
        </div>

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

        <div class="result-actions">
          <Button variant="outline" tone="neutral" type="button" @click="router.push('/import/review')">
            Back to rows
          </Button>
          <Button type="button" @click="resetAndStartAgain">Import another CSV</Button>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
