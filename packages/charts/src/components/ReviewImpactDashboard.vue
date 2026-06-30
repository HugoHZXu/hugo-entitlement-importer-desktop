<script setup lang="ts">
import { computed } from 'vue';

import type { ChartDatum, ReviewChartsPayload, ReviewImpactDashboardCopy } from '../types';
import ChartPanel from './ChartPanel.vue';
import G2BarChart from './G2BarChart.vue';
import SeatOccupancyChart from './SeatOccupancyChart.vue';

const defaultCopy: ReviewImpactDashboardCopy = {
  blocked: 'blocked',
  empty: 'Waiting for review data.',
  eyebrow: 'Live import impact',
  importableAfterConfirmation: 'importable after confirmation',
  issueReasonsDescription: 'Warnings and blocked rows grouped by validation reason.',
  issueReasonsTitle: 'Issue reasons',
  needsConfirmation: 'needs confirmation',
  noValidationIssues: 'No validation issues in the current review data.',
  rowReadinessDescription: 'Ready, confirmable, skipped, and blocked rows from the current review data.',
  rowReadinessTitle: 'Row readiness',
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
  seatProjectionBackend:
    'Projected occupied and remaining seats from backend validation. Confirmable rows are included; capacity overflow is finalized during commit.',
  seatProjectionLocal:
    'Draft estimate from editable rows before backend validation. Final capacity projection appears after validation.',
  seatProjectionTitle: 'Seat projection',
  skipped: 'skipped',
  title: 'Review current import plan',
  updated: 'Updated {time}',
};

const props = defineProps<{
  copy?: ReviewImpactDashboardCopy;
  locale?: string;
  payload: ReviewChartsPayload | null;
}>();
const copy = computed(() => props.copy ?? defaultCopy);

const issueChartData = computed<ChartDatum[]>(() =>
  (props.payload?.issueReasons ?? []).map((item) => ({
    id: item.code,
    label: item.label,
    value: item.count,
    tone:
      item.severity === 'blocked' ? 'danger' : item.severity === 'warning' ? 'warning' : 'neutral',
  }))
);
const seatProjectionDescription = computed(() =>
  props.payload?.seatProjectionSource === 'backendValidation'
    ? copy.value.seatProjectionBackend
    : copy.value.seatProjectionLocal
);

function formatTime(value: string) {
  return new Intl.DateTimeFormat(props.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatCopy(template: string, named: Record<string, string | number>): string {
  return Object.entries(named).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
</script>

<template>
  <section class="impact-dashboard">
    <div v-if="!payload" class="impact-dashboard__empty">{{ copy.empty }}</div>

    <template v-else>
      <header class="impact-dashboard__header">
        <div>
          <p class="impact-dashboard__eyebrow">{{ copy.eyebrow }}</p>
          <h1>{{ copy.title }}</h1>
          <p>
            {{ payload.fileName }} · {{ payload.productName }} · {{ payload.entitlementCode }}
          </p>
        </div>
        <div class="impact-dashboard__updated">
          {{ formatCopy(copy.updated, { time: formatTime(payload.updatedAt) }) }}
        </div>
      </header>

      <div class="impact-dashboard__summary">
        <div>
          <span>{{ payload.summary.importableRows }}</span>
          <small>{{ copy.importableAfterConfirmation }}</small>
        </div>
        <div>
          <span>{{ payload.summary.needsConfirmationRows }}</span>
          <small>{{ copy.needsConfirmation }}</small>
        </div>
        <div>
          <span>{{ payload.summary.skippedRows }}</span>
          <small>{{ copy.skipped }}</small>
        </div>
        <div>
          <span>{{ payload.summary.blockedRows }}</span>
          <small>{{ copy.blocked }}</small>
        </div>
      </div>

      <div class="impact-dashboard__grid">
        <ChartPanel
          :title="copy.rowReadinessTitle"
          :description="copy.rowReadinessDescription"
        >
          <G2BarChart :data="payload.statusDistribution" :value-label="copy.rows" />
        </ChartPanel>

        <ChartPanel
          :title="copy.seatProjectionTitle"
          :description="seatProjectionDescription"
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
            :empty-message="copy.noValidationIssues"
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

.impact-dashboard__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.impact-dashboard__summary div {
  display: grid;
  gap: 4px;
  min-width: 0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  padding: 12px 14px;
}

.impact-dashboard__summary span {
  color: #282036;
  font-size: 23px;
  font-weight: 600;
  line-height: 1;
}

.impact-dashboard__summary small {
  color: #7b7882;
  font-size: 12px;
  line-height: 1.3;
}

@media (max-width: 860px) {
  .impact-dashboard__summary,
  .impact-dashboard__header,
  .impact-dashboard__grid {
    grid-template-columns: 1fr;
  }

  .impact-dashboard__header {
    display: grid;
  }

}
</style>
