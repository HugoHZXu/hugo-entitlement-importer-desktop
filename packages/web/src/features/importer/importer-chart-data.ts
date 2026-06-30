import type {
  ChartDatum,
  ChartTone,
  IssueReasonDatum,
  ResultChartsPayload,
  ReviewChartsPayload,
  SeatImpactData,
} from '@hugo-entitlement-importer/charts';

import type {
  BulkImportHistoryDetail,
  BulkImportJobDetail,
  BulkImportResultBreakdownItem,
} from '@/shared/types';

import type { ImportCsvRow } from './importer-types';
import { summarizeImportResult, summarizeImportRows } from './importer-validation';

interface EntitlementSnapshot {
  name: string;
  entitlementCode: string;
  purchasedQuantity: number;
  allocatedQuantity: number;
}

interface ChartPayloadInput {
  rows: ImportCsvRow[];
  fileName?: string | null;
  entitlement?: EntitlementSnapshot | null;
  job?: BulkImportJobDetail | null;
  jobId?: string | null;
}

type ReviewSummary = ReviewChartsPayload['summary'];

export interface ImporterChartDataCopy {
  noFileSelected: string;
  resultBreakdownLabels: Record<string, string>;
  issueReasonLabels: Record<string, string>;
  selectedEntitlement: string;
  selectedProduct: string;
  statusLabels: Record<string, string>;
}

export const defaultImporterChartDataCopy: ImporterChartDataCopy = {
  noFileSelected: 'No file selected',
  resultBreakdownLabels: {
    failed: 'Failed',
    needsConfirmation: 'Needs confirmation',
    skipped: 'Skipped',
    success: 'Success',
  },
  issueReasonLabels: {
    already_allocated: 'Already allocated',
    conflicting_actions_in_file: 'Conflicting actions',
    deleted_by_user: 'Deleted by user',
    duplicate_email_in_file: 'Duplicate email',
    entitlement_not_active: 'Entitlement inactive',
    invalid_action: 'Invalid action',
    invalid_email: 'Invalid email',
    membership_not_found: 'Membership not found',
    missing_email: 'Missing email',
    not_allocated: 'Not allocated',
    seat_limit_exceeded: 'Seat limit exceeded',
    unregistered_user: 'Unregistered user',
    user_not_in_organization: 'User outside organization',
  },
  selectedEntitlement: 'Selected entitlement',
  selectedProduct: 'Selected product',
  statusLabels: {
    blocked: 'Blocked',
    deleted: 'Deleted',
    failed: 'Failed',
    needsConfirmation: 'Needs confirmation',
    ready: 'Ready',
    skipped: 'Skipped',
    success: 'Success',
    warning: 'Warning',
  },
};

function getEntitlement(input: ChartPayloadInput, copy: ImporterChartDataCopy) {
  return (
    input.entitlement ?? {
      name: copy.selectedProduct,
      entitlementCode: copy.selectedEntitlement,
      purchasedQuantity: 0,
      allocatedQuantity: 0,
    }
  );
}

function getFileName(input: ChartPayloadInput, copy: ImporterChartDataCopy) {
  return input.fileName?.trim() || copy.noFileSelected;
}

function getCommittedRows(rows: ImportCsvRow[]) {
  return rows.filter(
    (row) => !row.deleted && (row.status === 'ready' || row.status === 'success')
  );
}

function getReviewPlannedRows(rows: ImportCsvRow[]) {
  return rows.filter(
    (row) =>
      !row.deleted &&
      (row.status === 'ready' ||
        row.status === 'warning' ||
        row.status === 'needsConfirmation' ||
        row.status === 'success')
  );
}

function calculateSeatImpactFromRows(
  entitlement: EntitlementSnapshot,
  plannedRows: ImportCsvRow[]
): SeatImpactData {
  const plannedAssign = plannedRows
    .filter((row) => row.action === 'assign')
    .reduce((total) => total + 1, 0);
  const plannedRevoke = plannedRows
    .filter((row) => row.action === 'revoke')
    .reduce((total) => total + 1, 0);
  const projectedAllocated = entitlement.allocatedQuantity + plannedAssign - plannedRevoke;

  return {
    purchasedQuantity: entitlement.purchasedQuantity,
    currentAllocated: entitlement.allocatedQuantity,
    plannedAssign,
    plannedRevoke,
    projectedAllocated,
    availableAfterImport: entitlement.purchasedQuantity - projectedAllocated,
  };
}

function calculateSeatImpact(rows: ImportCsvRow[], entitlement: EntitlementSnapshot): SeatImpactData {
  return calculateSeatImpactFromRows(entitlement, getCommittedRows(rows));
}

function calculateReviewSeatImpact(input: ChartPayloadInput, entitlement: EntitlementSnapshot) {
  const plannedRows = getReviewPlannedRows(input.rows);
  const plannedAssign = plannedRows.filter((row) => row.action === 'assign').length;
  const plannedRevoke = plannedRows.filter((row) => row.action === 'revoke').length;
  const job = input.job;

  if (job) {
    return {
      purchasedQuantity: job.purchasedQuantity,
      currentAllocated: job.allocatedBefore,
      plannedAssign,
      plannedRevoke,
      projectedAllocated: job.projectedAllocatedQuantity,
      availableAfterImport: job.projectedAvailableQuantity,
    };
  }

  return calculateSeatImpactFromRows(entitlement, plannedRows);
}

function getReviewSummary(rows: ImportCsvRow[], job?: BulkImportJobDetail | null): ReviewSummary {
  const deletedRows = rows.filter((row) => row.deleted).length;

  if (job) {
    const importableRows = job.readyRows + job.needsConfirmationRows;

    return {
      totalRows: job.totalRows + deletedRows,
      importableRows,
      readyRows: job.readyRows,
      needsConfirmationRows: job.needsConfirmationRows,
      warningRows: job.warningRows,
      skippedRows: job.skippedRows,
      blockedRows: job.blockedRows,
      deletedRows,
    };
  }

  const activeRows = rows.filter((row) => !row.deleted);
  const readyRows = activeRows.filter((row) => row.status === 'ready' || row.status === 'success')
    .length;
  const needsConfirmationRows = activeRows.filter((row) => row.status === 'needsConfirmation')
    .length;

  return {
    totalRows: rows.length,
    importableRows: readyRows + needsConfirmationRows,
    readyRows,
    needsConfirmationRows,
    warningRows: activeRows.filter((row) => row.status === 'warning').length,
    skippedRows: activeRows.filter((row) => row.status === 'skipped').length,
    blockedRows: activeRows.filter((row) => row.status === 'blocked' || row.status === 'failed')
      .length,
    deletedRows,
  };
}

function toReasonLabel(code: string, copy: ImporterChartDataCopy) {
  return copy.issueReasonLabels[code] ?? code.replaceAll('_', ' ');
}

function toReasonSeverity(severity: string): 'warning' | 'blocked' | 'skipped' {
  if (severity === 'warning' || severity === 'blocked' || severity === 'skipped') {
    return severity;
  }

  return 'blocked';
}

function toResultBreakdownTone(item: BulkImportResultBreakdownItem): ChartTone {
  if (item.id === 'success') {
    return 'success';
  }

  if (item.id === 'skipped' || item.id === 'needsConfirmation') {
    return 'warning';
  }

  return 'danger';
}

function getHistoryDetailUpdatedAt(detail: BulkImportHistoryDetail): string {
  return (
    detail.job.completedAt ??
    detail.job.committedAt ??
    detail.job.validatedAt ??
    detail.job.lastHeartbeatAt ??
    detail.job.createdAt
  );
}

function getIssueReasons(
  rows: ImportCsvRow[],
  includeDeletedReason: boolean,
  copy: ImporterChartDataCopy
): IssueReasonDatum[] {
  const reasons = new Map<string, IssueReasonDatum>();

  for (const row of rows) {
    if (row.deleted) {
      continue;
    }

    for (const issue of row.issues) {
      const existingReason = reasons.get(issue.code);

      if (existingReason) {
        existingReason.count += 1;
        continue;
      }

      reasons.set(issue.code, {
        code: issue.code,
        label: toReasonLabel(issue.code, copy),
        count: 1,
        severity: toReasonSeverity(issue.severity),
      });
    }
  }

  if (includeDeletedReason) {
    const deletedRows = rows.filter((row) => row.deleted).length;

    if (deletedRows > 0) {
      reasons.set('deleted_by_user', {
        code: 'deleted_by_user',
        label: toReasonLabel('deleted_by_user', copy),
        count: deletedRows,
        severity: 'skipped',
      });
    }
  }

  return Array.from(reasons.values()).sort((left, right) => right.count - left.count);
}

export function buildReviewChartsPayload(
  input: ChartPayloadInput,
  copy: ImporterChartDataCopy = defaultImporterChartDataCopy
): ReviewChartsPayload {
  const entitlement = getEntitlement(input, copy);
  const summary = getReviewSummary(input.rows, input.job);

  const statusDistribution: ChartDatum[] = [
    { id: 'ready', label: copy.statusLabels.ready, value: summary.readyRows, tone: 'success' },
    {
      id: 'needsConfirmation',
      label: copy.statusLabels.needsConfirmation,
      value: summary.needsConfirmationRows,
      tone: 'info',
    },
    { id: 'warning', label: copy.statusLabels.warning, value: summary.warningRows, tone: 'warning' },
    { id: 'skipped', label: copy.statusLabels.skipped, value: summary.skippedRows, tone: 'neutral' },
    { id: 'blocked', label: copy.statusLabels.blocked, value: summary.blockedRows, tone: 'danger' },
    { id: 'deleted', label: copy.statusLabels.deleted, value: summary.deletedRows, tone: 'neutral' },
  ];

  return {
    fileName: getFileName(input, copy),
    productName: entitlement.name,
    entitlementCode: entitlement.entitlementCode,
    updatedAt: new Date().toISOString(),
    summary: {
      totalRows: summary.totalRows,
      importableRows: summary.importableRows,
      readyRows: summary.readyRows,
      needsConfirmationRows: summary.needsConfirmationRows,
      warningRows: summary.warningRows,
      skippedRows: summary.skippedRows,
      blockedRows: summary.blockedRows,
      deletedRows: summary.deletedRows,
    },
    statusDistribution,
    seatImpact: calculateReviewSeatImpact(input, entitlement),
    seatProjectionSource: input.job ? 'backendValidation' : 'localEstimate',
    issueReasons: getIssueReasons(input.rows, false, copy),
  };
}

export function buildResultChartsPayload(
  input: ChartPayloadInput,
  copy: ImporterChartDataCopy = defaultImporterChartDataCopy
): ResultChartsPayload {
  const entitlement = getEntitlement(input, copy);
  const resultSummary = summarizeImportResult(input.rows);
  const rowSummary = summarizeImportRows(input.rows);
  const skippedRows = resultSummary.skippedRows + rowSummary.deletedRows;

  return {
    fileName: getFileName(input, copy),
    jobId: input.jobId ?? null,
    productName: entitlement.name,
    entitlementCode: entitlement.entitlementCode,
    updatedAt: new Date().toISOString(),
    resultBreakdown: [
      {
        id: 'success',
        label: copy.resultBreakdownLabels.success,
        value: resultSummary.successRows,
        tone: 'success',
      },
      {
        id: 'skipped',
        label: copy.resultBreakdownLabels.skipped,
        value: skippedRows,
        tone: 'warning',
      },
      {
        id: 'failed',
        label: copy.resultBreakdownLabels.failed,
        value: resultSummary.failedRows,
        tone: 'danger',
      },
    ],
    seatImpact: calculateSeatImpact(input.rows, entitlement),
    issueReasons: getIssueReasons(input.rows, true, copy),
    totals: {
      successRows: resultSummary.successRows,
      skippedRows,
      failedRows: resultSummary.failedRows,
      processedRows: resultSummary.processedRows,
    },
  };
}

export function buildHistoryDetailResultChartsPayload(
  detail: BulkImportHistoryDetail,
  copy: ImporterChartDataCopy = defaultImporterChartDataCopy
): ResultChartsPayload {
  return {
    fileName: detail.job.fileName,
    jobId: detail.job.id,
    productName: detail.job.productName || detail.job.productId,
    entitlementCode: detail.job.orgProductEntitlementId,
    updatedAt: getHistoryDetailUpdatedAt(detail),
    resultBreakdown: detail.resultBreakdown.map((item) => ({
      id: item.id,
      label: copy.resultBreakdownLabels[item.id] ?? item.label,
      value: item.count,
      tone: toResultBreakdownTone(item),
    })),
    seatImpact: {
      purchasedQuantity: detail.seatImpact.purchasedQuantity,
      currentAllocated: detail.seatImpact.occupiedBefore,
      plannedAssign: detail.seatImpact.assignedSeats,
      plannedRevoke: detail.seatImpact.revokedSeats,
      projectedAllocated: detail.seatImpact.occupiedAfter,
      availableAfterImport: detail.seatImpact.remainingAfter,
    },
    issueReasons: detail.issueReasons.map((reason) => ({
      code: reason.code,
      label: copy.issueReasonLabels[reason.code] ?? (reason.message || toReasonLabel(reason.code, copy)),
      count: reason.rowCount,
      severity: toReasonSeverity(reason.severity),
    })),
    totals: {
      successRows: detail.resultSummary.successRows,
      skippedRows: detail.resultSummary.skippedRows,
      failedRows: detail.resultSummary.failedOrBlockedRows,
      processedRows: detail.resultSummary.processedRows,
    },
  };
}
