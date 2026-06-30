<script setup lang="ts">
import type { ResultChartsPayload } from '@hugo-entitlement-importer/charts';
import { ResultChartsDashboard } from '@hugo-entitlement-importer/charts';
import { Button, StatusBadge, type StatusBadgeTone } from '@hugo-ui/shadcn-vue';

const props = withDefaults(
  defineProps<{
    canExport?: boolean;
    exportError?: string | null;
    exportLabel?: string;
    exporting?: boolean;
    payload: ResultChartsPayload;
    primaryActionLabel?: string | null;
    statusLabel: string;
    status?: string;
    title?: string;
    tone?: StatusBadgeTone;
  }>(),
  {
    canExport: false,
    exportError: null,
    exportLabel: 'Export package (.zip)',
    exporting: false,
    primaryActionLabel: null,
    status: 'completed',
    title: 'Import result',
    tone: 'success',
  }
);

const emit = defineEmits<{
  export: [];
  primaryAction: [];
}>();
</script>

<template>
  <div class="result-layout">
    <header class="result-header">
      <div class="result-title">
        <StatusBadge :label="statusLabel" show-dot :status="status" :tone="tone" />
        <h1>{{ title }}</h1>
      </div>
      <p class="result-file-name">{{ payload.fileName }}</p>
      <div class="result-actions">
        <Button
          v-if="props.primaryActionLabel"
          type="button"
          @click="emit('primaryAction')"
        >
          {{ props.primaryActionLabel }}
        </Button>
      </div>
      <button
        class="result-export-link"
        type="button"
        :disabled="!canExport || exporting"
        @click="emit('export')"
      >
        {{ exporting ? 'Exporting package...' : exportLabel }}
      </button>
    </header>

    <div v-if="exportError" class="workflow-message error">
      <strong>Export failed</strong>
      <span>{{ exportError }}</span>
    </div>

    <ResultChartsDashboard :payload="payload" />
  </div>
</template>
