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
