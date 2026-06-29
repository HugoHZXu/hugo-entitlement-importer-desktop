<script setup lang="ts">
import { Chart, type G2Spec } from '@antv/g2';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export interface ReviewStatusDatum {
  label: string;
  count: number;
}

const props = defineProps<{
  data: ReviewStatusDatum[];
}>();

const chartContainer = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

const totalRows = computed(() => props.data.reduce((total, item) => total + item.count, 0));

function destroyChart() {
  chart?.destroy();
  chart = null;
}

async function renderChart() {
  await nextTick();

  if (!chartContainer.value) {
    return;
  }

  destroyChart();

  const chartOptions: G2Spec = {
    type: 'interval',
    data: props.data,
    height: 260,
    autoFit: true,
    encode: {
      x: 'label',
      y: 'count',
      color: 'label',
    },
    axis: {
      x: { title: false },
      y: { title: false, grid: true },
    },
    legend: false,
    tooltip: {
      title: 'label',
      items: [{ field: 'count', name: 'Rows' }],
    },
    style: {
      radiusTopLeft: 6,
      radiusTopRight: 6,
    },
    scale: {
      color: {
        range: ['#008805', '#eb6a00', '#cb2a2a', '#9e9e9e'],
      },
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
  () => props.data,
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
  <section class="review-status-chart" aria-label="Review status chart">
    <header class="review-status-chart__header">
      <div>
        <p class="review-status-chart__eyebrow">Chart window probe</p>
        <h1>Review row distribution</h1>
      </div>
      <div class="review-status-chart__total">
        <span>{{ totalRows }}</span>
        <small>rows</small>
      </div>
    </header>

    <div ref="chartContainer" class="review-status-chart__canvas" />
  </section>
</template>

<style scoped>
.review-status-chart {
  display: grid;
  gap: 24px;
  min-height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  padding: 28px;
}

.review-status-chart__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.review-status-chart__eyebrow {
  margin: 0 0 6px;
  color: #7d3f98;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.review-status-chart h1 {
  margin: 0;
  color: #282036;
  font-size: 26px;
  line-height: 1.2;
}

.review-status-chart__total {
  display: grid;
  justify-items: end;
  color: #282036;
}

.review-status-chart__total span {
  font-size: 30px;
  font-weight: 600;
  line-height: 1;
}

.review-status-chart__total small {
  color: #9e9e9e;
  font-size: 12px;
}

.review-status-chart__canvas {
  min-height: 280px;
}
</style>
