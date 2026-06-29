import type {
  ChartDatum,
  IssueReasonDatum,
  ResultChartsPayload,
  ReviewChartsPayload,
  SeatImpactData,
} from '@hugo-entitlement-importer/charts';

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
  jobId?: string | null;
}

const fallbackEntitlement: EntitlementSnapshot = {
  name: 'Selected product',
  entitlementCode: 'Selected entitlement',
  purchasedQuantity: 0,
  allocatedQuantity: 0,
};

const issueReasonLabels: Record<string, string> = {
  missing_email: 'Missing email',
  invalid_email: 'Invalid email',
  invalid_action: 'Invalid action',
  invalid_seat_quantity: 'Invalid seat quantity',
  duplicate_email_in_file: 'Duplicate email',
  conflicting_actions_in_file: 'Conflicting actions',
  membership_not_found: 'Membership not found',
  entitlement_not_active: 'Entitlement inactive',
  already_allocated: 'Already allocated',
  not_allocated: 'Not allocated',
  seat_limit_exceeded: 'Seat limit exceeded',
  deleted_by_user: 'Deleted by user',
};

function getEntitlement(input: ChartPayloadInput) {
  return input.entitlement ?? fallbackEntitlement;
}

function getFileName(input: ChartPayloadInput) {
  return input.fileName?.trim() || 'No file selected';
}

function getReadyRows(rows: ImportCsvRow[]) {
  return rows.filter(
    (row) =>
      !row.deleted && (row.status === 'ready' || row.status === 'success') && row.seatQuantity !== null
  );
}

function calculateSeatImpact(rows: ImportCsvRow[], entitlement: EntitlementSnapshot): SeatImpactData {
  const readyRows = getReadyRows(rows);
  const plannedAssign = readyRows
    .filter((row) => row.action === 'assign')
    .reduce((total, row) => total + (row.seatQuantity ?? 0), 0);
  const plannedRevoke = readyRows
    .filter((row) => row.action === 'revoke')
    .reduce((total, row) => total + (row.seatQuantity ?? 0), 0);
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

function toReasonLabel(code: string) {
  return issueReasonLabels[code] ?? code.replaceAll('_', ' ');
}

function toReasonSeverity(severity: string): 'warning' | 'blocked' | 'skipped' {
  if (severity === 'warning' || severity === 'blocked' || severity === 'skipped') {
    return severity;
  }

  return 'blocked';
}

function getIssueReasons(rows: ImportCsvRow[], includeDeletedReason: boolean): IssueReasonDatum[] {
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
        label: toReasonLabel(issue.code),
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
        label: toReasonLabel('deleted_by_user'),
        count: deletedRows,
        severity: 'skipped',
      });
    }
  }

  return Array.from(reasons.values()).sort((left, right) => right.count - left.count);
}

export function buildReviewChartsPayload(input: ChartPayloadInput): ReviewChartsPayload {
  const entitlement = getEntitlement(input);
  const summary = summarizeImportRows(input.rows);

  const statusDistribution: ChartDatum[] = [
    { id: 'ready', label: 'Ready', value: summary.readyRows, tone: 'success' },
    { id: 'warning', label: 'Warning', value: summary.warningRows, tone: 'warning' },
    { id: 'blocked', label: 'Blocked', value: summary.blockedRows, tone: 'danger' },
    { id: 'deleted', label: 'Deleted', value: summary.deletedRows, tone: 'neutral' },
  ];

  return {
    fileName: getFileName(input),
    productName: entitlement.name,
    entitlementCode: entitlement.entitlementCode,
    updatedAt: new Date().toISOString(),
    summary: {
      totalRows: summary.totalRows,
      readyRows: summary.readyRows,
      warningRows: summary.warningRows,
      blockedRows: summary.blockedRows,
      deletedRows: summary.deletedRows,
    },
    statusDistribution,
    seatImpact: calculateSeatImpact(input.rows, entitlement),
    issueReasons: getIssueReasons(input.rows, false),
  };
}

export function buildResultChartsPayload(input: ChartPayloadInput): ResultChartsPayload {
  const entitlement = getEntitlement(input);
  const resultSummary = summarizeImportResult(input.rows);
  const rowSummary = summarizeImportRows(input.rows);
  const skippedRows = resultSummary.skippedRows + rowSummary.deletedRows;

  return {
    fileName: getFileName(input),
    jobId: input.jobId ?? null,
    productName: entitlement.name,
    entitlementCode: entitlement.entitlementCode,
    updatedAt: new Date().toISOString(),
    resultBreakdown: [
      { id: 'success', label: 'Success', value: resultSummary.successRows, tone: 'success' },
      { id: 'skipped', label: 'Skipped', value: skippedRows, tone: 'warning' },
      { id: 'failed', label: 'Failed', value: resultSummary.failedRows, tone: 'danger' },
    ],
    seatImpact: calculateSeatImpact(input.rows, entitlement),
    issueReasons: getIssueReasons(input.rows, true),
    totals: {
      successRows: resultSummary.successRows,
      skippedRows,
      failedRows: resultSummary.failedRows,
      processedRows: resultSummary.processedRows,
    },
  };
}
