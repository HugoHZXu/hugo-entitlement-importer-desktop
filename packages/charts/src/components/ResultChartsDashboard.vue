<script setup lang="ts">
import { computed } from 'vue';

import type { ChartDatum, ResultChartsDashboardCopy, ResultChartsPayload } from '../types';
import ChartPanel from './ChartPanel.vue';
import G2BarChart from './G2BarChart.vue';
import SeatOccupancyChart from './SeatOccupancyChart.vue';

const defaultCopy: ResultChartsDashboardCopy = {
  breakdownDescription: 'Committed, skipped, and failed rows.',
  breakdownTitle: 'Result breakdown',
  failed: 'failed',
  issueReasonsDescription: 'Skipped and failed rows grouped by the reason shown to the operator.',
  issueReasonsTitle: 'Issue reasons',
  noIssueRows: 'No skipped or failed rows.',
  processed: 'processed',
  rows: 'Rows',
  seat: {
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
  },
  seatImpactDescription: 'Final seat movement from committed rows.',
  seatImpactTitle: 'Seat impact',
  skipped: 'skipped',
  success: 'success',
};

const props = defineProps<{
  copy?: ResultChartsDashboardCopy;
  payload: ResultChartsPayload;
}>();
const copy = computed(() => props.copy ?? defaultCopy);

const issueChartData = computed<ChartDatum[]>(() =>
  props.payload.issueReasons.map((item) => ({
    id: item.code,
    label: item.label,
    value: item.count,
    tone:
      item.severity === 'blocked' ? 'danger' : item.severity === 'warning' ? 'warning' : 'neutral',
  }))
);
</script>

<template>
  <section class="result-dashboard">
    <div class="result-dashboard__summary">
      <div>
        <span>{{ payload.totals.successRows }}</span>
        <small>{{ copy.success }}</small>
      </div>
      <div>
        <span>{{ payload.totals.skippedRows }}</span>
        <small>{{ copy.skipped }}</small>
      </div>
      <div>
        <span>{{ payload.totals.failedRows }}</span>
        <small>{{ copy.failed }}</small>
      </div>
      <div>
        <span>{{ payload.totals.processedRows }}</span>
        <small>{{ copy.processed }}</small>
      </div>
    </div>

    <div class="result-dashboard__grid">
      <ChartPanel
        :title="copy.breakdownTitle"
        :description="copy.breakdownDescription"
      >
        <G2BarChart :data="payload.resultBreakdown" :value-label="copy.rows" />
      </ChartPanel>

      <ChartPanel
        :title="copy.seatImpactTitle"
        :description="copy.seatImpactDescription"
      >
        <SeatOccupancyChart :data="payload.seatImpact" :copy="copy.seat" />
      </ChartPanel>

      <ChartPanel
        :title="copy.issueReasonsTitle"
        :description="copy.issueReasonsDescription"
        wide
      >
        <G2BarChart
          :data="issueChartData"
          :height="240"
          :value-label="copy.rows"
          :empty-message="copy.noIssueRows"
        />
      </ChartPanel>
    </div>
  </section>
</template>

<style scoped>
.result-dashboard {
  display: grid;
  gap: 16px;
}

.result-dashboard__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.result-dashboard__summary div {
  display: grid;
  gap: 4px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
}

.result-dashboard__summary span {
  color: #282036;
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
}

.result-dashboard__summary small {
  color: #7b7882;
  font-size: 12px;
}

.result-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 860px) {
  .result-dashboard__summary,
  .result-dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
