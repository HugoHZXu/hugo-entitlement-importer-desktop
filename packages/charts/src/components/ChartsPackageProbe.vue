<script setup lang="ts">
import type { ChartOptions } from '@antv/g2';

const g2RuntimeLabel: keyof Pick<ChartOptions, 'container'> = 'container';
</script>

<template>
  <section class="charts-probe" aria-label="Charts package integration">
    <div>
      <p class="charts-probe__eyebrow">Charts package</p>
      <h3>Import analytics placeholder</h3>
      <p>G2 type link checked through {{ g2RuntimeLabel }}. Real review and result charts will live in this package.</p>
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
