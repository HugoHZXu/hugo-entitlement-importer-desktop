export type BulkImportJobStatus =
  | 'draft'
  | 'imported'
  | 'validating'
  | 'validated'
  | 'awaitingConfirmation'
  | 'readyToCommit'
  | 'processing'
  | 'completed'
  | 'completedWithErrors'
  | 'cancelled'
  | 'failed';

export type BulkImportJobPhase =
  | 'job_created'
  | 'rows_staged'
  | 'validation_queued'
  | 'validating_rows'
  | 'awaiting_review'
  | 'awaiting_unregistered_user_confirmation'
  | 'commit_queued'
  | 'applying_changes'
  | 'generating_artifacts'
  | 'artifacts_ready'
  | 'cancelled'
  | 'failed';

export type BulkImportIssueCode =
  | 'missing_email'
  | 'invalid_email'
  | 'duplicate_email_in_file'
  | 'conflicting_actions_in_file'
  | 'invalid_action'
  | 'unregistered_user'
  | 'user_not_in_organization'
  | 'membership_not_found'
  | 'entitlement_not_active'
  | 'already_allocated'
  | 'not_allocated'
  | 'seat_limit_exceeded'
  | (string & {});

export type BulkImportIssueSeverity = 'warning' | 'blocked' | (string & {});

export interface BulkImportIssue {
  code: BulkImportIssueCode;
  severity: BulkImportIssueSeverity;
  message: string;
}

export type BulkImportRowAction = 'assign' | 'revoke';

export type BulkImportRowStatus =
  | 'ready'
  | 'warning'
  | 'needsConfirmation'
  | 'blocked'
  | 'skipped'
  | 'success'
  | 'failed'
  | (string & {});

export interface BulkImportJobRow {
  id: string;
  jobId: string;
  rowNumber: number;
  email: string;
  normalizedEmail: string;
  name: string;
  department: string;
  action: BulkImportRowAction;
  status: BulkImportRowStatus;
  issues: BulkImportIssue[];
  organizationMembershipId: string | null;
  allocationId: string | null;
}

export interface BulkImportJob {
  id: string;
  organizationId: string;
  productId: string;
  productName: string;
  orgProductEntitlementId: string;
  fileName: string;
  status: BulkImportJobStatus;
  phase: BulkImportJobPhase;
  progressPercent: number;
  processedRows: number;
  totalRows: number;
  readyRows: number;
  warningRows: number;
  needsConfirmationRows: number;
  unregisteredUserCount: number;
  unregisteredSeatQuantity: number;
  blockedRows: number;
  skippedRows: number;
  successRows: number;
  failedRows: number;
  allocatedBefore: number;
  purchasedQuantity: number;
  projectedAllocatedQuantity: number;
  projectedAvailableQuantity: number;
  canValidate: boolean;
  canCommit: boolean;
  canConfirmImportRows: boolean;
  canCancel: boolean;
  canDownloadResults: boolean;
  nextPollAfterMs: number | null;
  createdAt: string;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  validatedAt: string | null;
  committedAt: string | null;
  completedAt: string | null;
  cancelRequestedAt: string | null;
  errorMessage: string | null;
}

export type BulkImportJobDetail = BulkImportJob & {
  rows?: BulkImportJobRow[];
};

export interface PageResult<T> {
  items: T[];
  totalElements: number;
  pageNumber: number;
  pageSize: number;
}

export interface BulkImportResultBreakdownItem {
  id: 'success' | 'needsConfirmation' | 'skipped' | 'failed';
  label: string;
  count: number;
  statuses: BulkImportRowStatus[];
}

export interface BulkImportIssueReason {
  code: BulkImportIssue['code'];
  severity: 'warning' | 'blocked';
  message: string;
  rowCount: number;
}

export interface BulkImportSeatImpact {
  occupiedBefore: number;
  assignedSeats: number;
  revokedSeats: number;
  occupiedAfter: number;
  remainingAfter: number;
  purchasedQuantity: number;
  occupiedPercentAfter: number;
}

export interface BulkImportHistoryDetail {
  job: BulkImportJob;
  resultSummary: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    skippedRows: number;
    needsConfirmationRows: number;
    unregisteredUserCount: number;
    unregisteredSeatQuantity: number;
    failedRows: number;
    blockedRows: number;
    failedOrBlockedRows: number;
    reviewItemRows: number;
  };
  resultBreakdown: BulkImportResultBreakdownItem[];
  issueReasons: BulkImportIssueReason[];
  seatImpact: BulkImportSeatImpact;
  download: {
    canDownloadResults: boolean;
    artifactZipUrl: string | null;
  };
}

export interface CreateBulkImportJobRowInput {
  rowNumber: number;
  email: string;
  name?: string;
  department?: string;
  action?: string;
}

export interface CreateBulkImportJobInput {
  organizationId: string;
  productId: string;
  orgProductEntitlementId: string;
  fileName: string;
  rows: CreateBulkImportJobRowInput[];
  canManageOrganizationMembership?: boolean;
}

export type BulkImportResultArtifact = 'report' | 'success.csv' | 'failed.csv';

export interface CommitBulkImportJobInput {
  confirmImportRows?: boolean;
}
