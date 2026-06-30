export type ChartTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface ChartDatum {
  id: string;
  label: string;
  value: number;
  tone?: ChartTone;
}

export interface IssueReasonDatum {
  code: string;
  label: string;
  count: number;
  severity: 'warning' | 'blocked' | 'skipped';
}

export interface SeatImpactData {
  purchasedQuantity: number;
  currentAllocated: number;
  plannedAssign: number;
  plannedRevoke: number;
  projectedAllocated: number;
  availableAfterImport: number;
}

export type SeatProjectionSource = 'backendValidation' | 'localEstimate';

export interface SeatOccupancyChartCopy {
  currentOccupied: string;
  noCapacityData: string;
  occupiedPercent: string;
  ofPurchased: string;
  plannedAssign: string;
  plannedRevoke: string;
  projectedOccupied: string;
  remaining: string;
  remainingAfter: string;
  seats: string;
}

export interface ReviewImpactDashboardCopy {
  blocked: string;
  empty: string;
  eyebrow: string;
  importableAfterConfirmation: string;
  issueReasonsDescription: string;
  issueReasonsTitle: string;
  needsConfirmation: string;
  noValidationIssues: string;
  rowReadinessDescription: string;
  rowReadinessTitle: string;
  rows: string;
  seat: SeatOccupancyChartCopy;
  seatProjectionBackend: string;
  seatProjectionLocal: string;
  seatProjectionTitle: string;
  skipped: string;
  title: string;
  updated: string;
}

export interface ResultChartsDashboardCopy {
  breakdownDescription: string;
  breakdownTitle: string;
  failed: string;
  issueReasonsDescription: string;
  issueReasonsTitle: string;
  noIssueRows: string;
  processed: string;
  rows: string;
  seat: SeatOccupancyChartCopy;
  seatImpactDescription: string;
  seatImpactTitle: string;
  skipped: string;
  success: string;
}

export interface ReviewStatusChartCopy {
  ariaLabel: string;
  eyebrow: string;
  rows: string;
  title: string;
}

export interface ChartsPackageProbeCopy {
  ariaLabel: string;
  description: string;
  eyebrow: string;
  title: string;
}

export interface ReviewChartsPayload {
  fileName: string;
  productName: string;
  entitlementCode: string;
  updatedAt: string;
  summary: {
    totalRows: number;
    importableRows: number;
    readyRows: number;
    needsConfirmationRows: number;
    warningRows: number;
    skippedRows: number;
    blockedRows: number;
    deletedRows: number;
  };
  statusDistribution: ChartDatum[];
  seatImpact: SeatImpactData;
  seatProjectionSource: SeatProjectionSource;
  issueReasons: IssueReasonDatum[];
}

export interface ResultChartsPayload {
  fileName: string;
  jobId: string | null;
  productName: string;
  entitlementCode: string;
  updatedAt: string;
  resultBreakdown: ChartDatum[];
  seatImpact: SeatImpactData;
  issueReasons: IssueReasonDatum[];
  totals: {
    successRows: number;
    skippedRows: number;
    failedRows: number;
    processedRows: number;
  };
}
