<script setup lang="ts">
import { Chart, type G2Spec } from '@antv/g2';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { SeatImpactData, SeatOccupancyChartCopy } from '../types';

const defaultCopy: SeatOccupancyChartCopy = {
  currentOccupied: 'Current occupied',
  noCapacityData: 'No seat capacity data',
  occupiedPercent: '{percent}% occupied',
  ofPurchased: 'of {purchased}',
  plannedAssign: 'Planned assign',
  plannedRevoke: 'Planned revoke',
  projectedOccupied: 'Projected occupied',
  remaining: 'Remaining',
  remainingAfter: 'Remaining after',
  seats: 'Seats',
};

const props = defineProps<{
  copy?: SeatOccupancyChartCopy;
  data: SeatImpactData;
}>();
const copy = computed(() => props.copy ?? defaultCopy);

const chartContainer = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

const occupiedSeats = computed(() => Math.max(0, props.data.projectedAllocated));
const remainingSeats = computed(() => Math.max(0, props.data.availableAfterImport));
const occupancyPercent = computed(() => {
  if (props.data.purchasedQuantity <= 0) {
    return 0;
  }

  return Math.round((occupiedSeats.value / props.data.purchasedQuantity) * 100);
});
const chartData = computed(() => [
  {
    id: 'occupied',
    label: copy.value.projectedOccupied,
    value: occupiedSeats.value,
  },
  {
    id: 'remaining',
    label: copy.value.remaining,
    value: remainingSeats.value,
  },
]);
const hasCapacityData = computed(() => props.data.purchasedQuantity > 0);

function destroyChart() {
  chart?.destroy();
  chart = null;
}

async function renderChart() {
  await nextTick();

  if (!chartContainer.value || !hasCapacityData.value) {
    destroyChart();
    return;
  }

  destroyChart();

  const chartOptions: G2Spec = {
    type: 'interval',
    data: chartData.value,
    height: 240,
    autoFit: true,
    coordinate: {
      type: 'theta',
      innerRadius: 0.66,
      outerRadius: 0.94,
    },
    transform: [{ type: 'stackY' }],
    encode: {
      y: 'value',
      color: 'label',
    },
    legend: false,
    scale: {
      color: {
        range: ['#9955c6', '#e0e0e0'],
      },
    },
    style: {
      stroke: '#ffffff',
      lineWidth: 2,
    },
    tooltip: {
      title: 'label',
      items: [{ field: 'value', name: copy.value.seats }],
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
  () => [copy.value, props.data],
  () => {
    void renderChart();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  destroyChart();
});

function formatCopy(template: string, named: Record<string, string | number>): string {
  return Object.entries(named).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
</script>

<template>
  <div class="seat-occupancy">
    <div v-if="!hasCapacityData" class="seat-occupancy__empty">
      {{ copy.noCapacityData }}
    </div>

    <template v-else>
      <div class="seat-occupancy__chart">
        <div ref="chartContainer" class="seat-occupancy__canvas" />
        <div class="seat-occupancy__center">
          <strong>{{ occupiedSeats }}</strong>
          <span>{{ formatCopy(copy.ofPurchased, { purchased: data.purchasedQuantity }) }}</span>
          <small>{{ formatCopy(copy.occupiedPercent, { percent: occupancyPercent }) }}</small>
        </div>
      </div>

      <dl class="seat-occupancy__facts">
        <div>
          <dt>{{ copy.currentOccupied }}</dt>
          <dd>{{ data.currentAllocated }}</dd>
        </div>
        <div>
          <dt>{{ copy.plannedAssign }}</dt>
          <dd>+{{ data.plannedAssign }}</dd>
        </div>
        <div>
          <dt>{{ copy.plannedRevoke }}</dt>
          <dd>-{{ data.plannedRevoke }}</dd>
        </div>
        <div>
          <dt>{{ copy.remainingAfter }}</dt>
          <dd>{{ remainingSeats }}</dd>
        </div>
      </dl>
    </template>
  </div>
</template>

<style scoped>
.seat-occupancy {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.seat-occupancy__chart {
  position: relative;
  min-height: 240px;
}

.seat-occupancy__canvas {
  min-height: 240px;
}

.seat-occupancy__center {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  min-width: 120px;
  translate: -50% -50%;
  justify-items: center;
  pointer-events: none;
}

.seat-occupancy__center strong {
  color: #282036;
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
}

.seat-occupancy__center span {
  margin-top: 4px;
  color: #5c5c5c;
  font-size: 13px;
}

.seat-occupancy__center small {
  margin-top: 2px;
  color: #7b7882;
  font-size: 12px;
}

.seat-occupancy__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.seat-occupancy__facts div {
  display: grid;
  gap: 3px;
  border-top: 1px solid #ececec;
  padding-top: 10px;
}

.seat-occupancy__facts dt {
  color: #7b7882;
  font-size: 12px;
}

.seat-occupancy__facts dd {
  margin: 0;
  color: #282036;
  font-weight: 600;
}

.seat-occupancy__empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  border: 1px dashed #d6d6d6;
  border-radius: 8px;
  color: #7b7882;
  font-size: 13px;
}
</style>
