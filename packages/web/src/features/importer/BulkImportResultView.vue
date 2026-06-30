<script setup lang="ts">
import type { ResultChartsPayload } from '@hugo-entitlement-importer/charts';
import { ResultChartsDashboard } from '@hugo-entitlement-importer/charts';
import { Button, StatusBadge, type StatusBadgeTone } from '@hugo-ui/shadcn-vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { createResultChartsDashboardCopy } from '@/shared/i18n/chart-copy';

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
    exporting: false,
    primaryActionLabel: null,
    status: 'completed',
    tone: 'success',
  }
);

const emit = defineEmits<{
  export: [];
  primaryAction: [];
}>();
const { t } = useI18n();
const resultChartsCopy = computed(() =>
  createResultChartsDashboardCopy((key, named) => t(key, named ?? {}))
);
const exportButtonLabel = computed(() => props.exportLabel ?? t('result.exportLabel'));
const titleText = computed(() => props.title ?? t('result.importResult'));
</script>

<template>
  <div class="result-layout">
    <header class="result-header">
      <div class="result-title">
        <StatusBadge :label="statusLabel" show-dot :status="status" :tone="tone" />
        <h1>{{ titleText }}</h1>
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
        {{ exporting ? t('result.exportingPackage') : exportButtonLabel }}
      </button>
    </header>

    <div v-if="exportError" class="workflow-message error">
      <strong>{{ t('result.exportFailed') }}</strong>
      <span>{{ exportError }}</span>
    </div>

    <ResultChartsDashboard :payload="payload" :copy="resultChartsCopy" />
  </div>
</template>
