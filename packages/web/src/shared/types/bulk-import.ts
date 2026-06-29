export type BulkImportJobStatus =
  | 'draft'
  | 'imported'
  | 'validating'
  | 'validated'
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
  | 'invalid_seat_quantity'
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
  seatQuantity: number;
  status: BulkImportRowStatus;
  issues: BulkImportIssue[];
  organizationMembershipId: string | null;
  allocationId: string | null;
}

export interface BulkImportJob {
  id: string;
  organizationId: string;
  productId: string;
  orgProductEntitlementId: string;
  fileName: string;
  status: BulkImportJobStatus;
  phase: BulkImportJobPhase;
  progressPercent: number;
  processedRows: number;
  totalRows: number;
  readyRows: number;
  warningRows: number;
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

export interface CreateBulkImportJobRowInput {
  rowNumber: number;
  email: string;
  name?: string;
  department?: string;
  action?: string;
  seatQuantity?: number;
}

export interface CreateBulkImportJobInput {
  organizationId: string;
  productId: string;
  orgProductEntitlementId: string;
  fileName: string;
  rows: CreateBulkImportJobRowInput[];
}

export type BulkImportResultArtifact = 'report' | 'success.csv' | 'failed.csv';
