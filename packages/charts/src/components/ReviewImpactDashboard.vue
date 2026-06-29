<script setup lang="ts">
import { computed } from 'vue';

import type { ChartDatum, ReviewChartsPayload } from '../types';
import ChartPanel from './ChartPanel.vue';
import G2BarChart from './G2BarChart.vue';
import SeatOccupancyChart from './SeatOccupancyChart.vue';

const props = defineProps<{
  payload: ReviewChartsPayload | null;
}>();

const issueChartData = computed<ChartDatum[]>(() =>
  (props.payload?.issueReasons ?? []).map((item) => ({
    id: item.code,
    label: item.label,
    value: item.count,
    tone:
      item.severity === 'blocked' ? 'danger' : item.severity === 'warning' ? 'warning' : 'neutral',
  }))
);

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
</script>

<template>
  <section class="impact-dashboard">
    <div v-if="!payload" class="impact-dashboard__empty">Waiting for review data.</div>

    <template v-else>
      <header class="impact-dashboard__header">
        <div>
          <p class="impact-dashboard__eyebrow">Live import impact</p>
          <h1>Review current import plan</h1>
          <p>
            {{ payload.fileName }} · {{ payload.productName }} · {{ payload.entitlementCode }}
          </p>
        </div>
        <div class="impact-dashboard__updated">Updated {{ formatTime(payload.updatedAt) }}</div>
      </header>

      <div class="impact-dashboard__grid">
        <ChartPanel
          title="Row readiness"
          description="Current row statuses from the editable review table."
        >
          <G2BarChart :data="payload.statusDistribution" value-label="Rows" />
        </ChartPanel>

        <ChartPanel
          title="Seat projection"
          description="Projected occupied and remaining seats after ready rows are committed."
        >
          <SeatOccupancyChart :data="payload.seatImpact" />
        </ChartPanel>

        <ChartPanel
          title="Issue reasons"
          description="Warnings and blocked rows grouped by validation reason."
          wide
        >
          <G2BarChart
            :data="issueChartData"
            :height="240"
            value-label="Rows"
            empty-message="No validation issues in the current review data."
          />
        </ChartPanel>
      </div>
    </template>
  </section>
</template>

<style scoped>
.impact-dashboard {
  min-height: 100%;
}

.impact-dashboard__empty {
  display: grid;
  min-height: 360px;
  place-items: center;
  color: #6c6a72;
}

.impact-dashboard__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.impact-dashboard__eyebrow {
  margin: 0 0 7px;
  color: #7d3f98;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.impact-dashboard h1 {
  margin: 0;
  color: #282036;
  font-size: 28px;
  line-height: 1.18;
}

.impact-dashboard__header p:not(.impact-dashboard__eyebrow) {
  margin: 8px 0 0;
  color: #5c5c5c;
  line-height: 1.45;
}

.impact-dashboard__updated {
  flex: none;
  color: #7b7882;
  font-size: 12px;
}

.impact-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 860px) {
  .impact-dashboard__header,
  .impact-dashboard__grid {
    grid-template-columns: 1fr;
  }

  .impact-dashboard__header {
    display: grid;
  }

}
</style>
