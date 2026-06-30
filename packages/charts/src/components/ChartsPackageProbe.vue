<script setup lang="ts">
import type { ChartOptions } from '@antv/g2';
import { computed } from 'vue';

import type { ChartsPackageProbeCopy } from '../types';

const g2RuntimeLabel: keyof Pick<ChartOptions, 'container'> = 'container';

const defaultCopy: ChartsPackageProbeCopy = {
  ariaLabel: 'Charts package integration',
  description:
    'G2 type link checked through {runtimeLabel}. Real review and result charts will live in this package.',
  eyebrow: 'Charts package',
  title: 'Import analytics placeholder',
};

const props = defineProps<{
  copy?: ChartsPackageProbeCopy;
}>();
const copy = computed(() => props.copy ?? defaultCopy);

function formatCopy(template: string, named: Record<string, string | number>): string {
  return Object.entries(named).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
</script>

<template>
  <section class="charts-probe" :aria-label="copy.ariaLabel">
    <div>
      <p class="charts-probe__eyebrow">{{ copy.eyebrow }}</p>
      <h3>{{ copy.title }}</h3>
      <p>{{ formatCopy(copy.description, { runtimeLabel: g2RuntimeLabel }) }}</p>
    </div>
  </section>
</template>

<style scoped>
.charts-probe {
  display: grid;
  min-height: 180px;
  align-items: center;
  border: 1px dashed var(--hugo-ui-shadcn-neutral-grey-800, #b8b8c0);
  border-radius: 8px;
  background: var(--hugo-ui-shadcn-surface-subtle, #f6f7f9);
  padding: 20px;
}

.charts-probe__eyebrow {
  color: var(--hugo-ui-shadcn-text-subtle, #70707a);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.charts-probe h3 {
  margin: 6px 0;
  color: var(--hugo-ui-shadcn-text-primary, #252233);
  font-size: 18px;
  line-height: 1.4;
}

.charts-probe p {
  margin: 0;
  color: var(--hugo-ui-shadcn-text-default, #585762);
  line-height: 1.5;
}
</style>
