import type {
  ResultChartsDashboardCopy,
  ReviewImpactDashboardCopy,
  SeatOccupancyChartCopy,
} from '@hugo-entitlement-importer/charts';

import type { ImporterChartDataCopy } from '@/features/importer/importer-chart-data';

type Translate = (key: string, named?: Record<string, unknown>) => string;

const issueCodes = [
  'already_allocated',
  'conflicting_actions_in_file',
  'deleted_by_user',
  'duplicate_email_in_file',
  'entitlement_not_active',
  'invalid_action',
  'invalid_email',
  'membership_not_found',
  'missing_email',
  'not_allocated',
  'seat_limit_exceeded',
  'unregistered_user',
  'user_not_in_organization',
];

const statusCodes = [
  'blocked',
  'deleted',
  'failed',
  'needsConfirmation',
  'ready',
  'skipped',
  'success',
  'warning',
];

const resultBreakdownCodes = ['failed', 'needsConfirmation', 'skipped', 'success'];

function mapTranslations(keys: string[], prefix: string, t: Translate): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, t(`${prefix}.${key}`)]));
}

export function createImporterChartDataCopy(t: Translate): ImporterChartDataCopy {
  return {
    noFileSelected: t('importer.chartData.noFileSelected'),
    resultBreakdownLabels: mapTranslations(resultBreakdownCodes, 'common.status', t),
    issueReasonLabels: mapTranslations(issueCodes, 'importer.chartData.issues', t),
    selectedEntitlement: t('importer.chartData.selectedEntitlement'),
    selectedProduct: t('importer.chartData.selectedProduct'),
    statusLabels: mapTranslations(statusCodes, 'common.status', t),
  };
}

export function createSeatOccupancyChartCopy(t: Translate): SeatOccupancyChartCopy {
  return {
    currentOccupied: t('charts.seat.currentOccupied'),
    noCapacityData: t('charts.seat.noCapacityData'),
    occupiedPercent: t('charts.seat.occupiedPercent'),
    ofPurchased: t('charts.seat.ofPurchased'),
    plannedAssign: t('charts.seat.plannedAssign'),
    plannedRevoke: t('charts.seat.plannedRevoke'),
    projectedOccupied: t('charts.seat.projectedOccupied'),
    remaining: t('charts.seat.remaining'),
    remainingAfter: t('charts.seat.remainingAfter'),
    seats: t('charts.seat.seats'),
  };
}

export function createReviewImpactDashboardCopy(t: Translate): ReviewImpactDashboardCopy {
  return {
    blocked: t('common.counts.blocked'),
    empty: t('charts.review.empty'),
    eyebrow: t('charts.review.eyebrow'),
    importableAfterConfirmation: t('common.counts.importableAfterConfirmation'),
    issueReasonsDescription: t('charts.review.issueReasonsDescription'),
    issueReasonsTitle: t('charts.review.issueReasonsTitle'),
    needsConfirmation: t('common.counts.needsConfirmation'),
    noValidationIssues: t('charts.review.noValidationIssues'),
    rowReadinessDescription: t('charts.review.rowReadinessDescription'),
    rowReadinessTitle: t('charts.review.rowReadinessTitle'),
    rows: t('common.labels.rows'),
    seat: createSeatOccupancyChartCopy(t),
    seatProjectionBackend: t('charts.review.seatProjectionBackend'),
    seatProjectionLocal: t('charts.review.seatProjectionLocal'),
    seatProjectionTitle: t('charts.review.seatProjectionTitle'),
    skipped: t('common.counts.skipped'),
    title: t('charts.review.title'),
    updated: t('charts.review.updated'),
  };
}

export function createResultChartsDashboardCopy(t: Translate): ResultChartsDashboardCopy {
  return {
    breakdownDescription: t('charts.result.breakdownDescription'),
    breakdownTitle: t('charts.result.breakdownTitle'),
    failed: t('common.counts.failed'),
    issueReasonsDescription: t('charts.result.issueReasonsDescription'),
    issueReasonsTitle: t('charts.result.issueReasonsTitle'),
    noIssueRows: t('charts.result.noIssueRows'),
    processed: t('common.counts.processed'),
    rows: t('common.labels.rows'),
    seat: createSeatOccupancyChartCopy(t),
    seatImpactDescription: t('charts.result.seatImpactDescription'),
    seatImpactTitle: t('charts.result.seatImpactTitle'),
    skipped: t('common.counts.skipped'),
    success: t('common.counts.success'),
  };
}
