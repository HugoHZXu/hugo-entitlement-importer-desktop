<script setup lang="ts">
import { Chart, type G2Spec } from '@antv/g2';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { ChartDatum, ChartTone } from '../types';

const props = withDefaults(
  defineProps<{
    data: ChartDatum[];
    height?: number;
    valueLabel?: string;
    emptyMessage?: string;
  }>(),
  {
    height: 220,
    valueLabel: 'Rows',
    emptyMessage: 'No chart data',
  }
);

const chartContainer = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

const visibleData = computed(() => props.data.filter((item) => item.value > 0));
const hasData = computed(() => visibleData.value.length > 0);

const toneColors: Record<ChartTone, string> = {
  success: '#008805',
  warning: '#eb6a00',
  danger: '#cb2a2a',
  neutral: '#9e9e9e',
  info: '#1573d4',
};

function destroyChart() {
  chart?.destroy();
  chart = null;
}

function resolveColor(item: ChartDatum, index: number) {
  const fallbackColors = ['#9955c6', '#1573d4', '#008805', '#eb6a00', '#cb2a2a', '#9e9e9e'];

  return item.tone ? toneColors[item.tone] : fallbackColors[index % fallbackColors.length];
}

async function renderChart() {
  await nextTick();

  if (!chartContainer.value || !hasData.value) {
    destroyChart();
    return;
  }

  destroyChart();

  const data = visibleData.value;
  const chartOptions: G2Spec = {
    type: 'interval',
    data,
    height: props.height,
    autoFit: true,
    encode: {
      x: 'label',
      y: 'value',
      color: 'label',
    },
    axis: {
      x: { title: false, labelAutoRotate: false },
      y: { title: false, grid: true },
    },
    legend: false,
    scale: {
      color: {
        range: data.map(resolveColor),
      },
    },
    style: {
      radiusTopLeft: 6,
      radiusTopRight: 6,
      maxWidth: 56,
    },
    tooltip: {
      title: 'label',
      items: [{ field: 'value', name: props.valueLabel }],
    },
  };

  chart = new Chart({
    container: chartContainer.value,
  });
  chart.options(chartOptions);
  await chart.render();
}

onMounted(() => {
  void renderChart();
});

watch(
  () => [props.data, props.height, props.valueLabel],
  () => {
    void renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  destroyChart();
});
</script>

<template>
  <div class="g2-bar-chart">
    <div v-if="!hasData" class="g2-bar-chart__empty">{{ emptyMessage }}</div>
    <div v-show="hasData" ref="chartContainer" class="g2-bar-chart__canvas" />
  </div>
</template>

<style scoped>
.g2-bar-chart {
  min-width: 0;
}

.g2-bar-chart__canvas {
  min-height: 180px;
}

.g2-bar-chart__empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 1px dashed #d6d6d6;
  border-radius: 8px;
  color: #7b7882;
  font-size: 13px;
}
</style>
