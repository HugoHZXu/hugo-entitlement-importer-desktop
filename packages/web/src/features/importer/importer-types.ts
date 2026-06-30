export type ImportAction = 'assign' | 'revoke';

export type ImportIssueCode =
  | 'missing_email'
  | 'invalid_email'
  | 'invalid_action'
  | 'duplicate_email_in_file'
  | 'conflicting_actions_in_file'
  | 'unregistered_user'
  | 'user_not_in_organization'
  | 'membership_not_found'
  | 'entitlement_not_active'
  | 'already_allocated'
  | 'not_allocated'
  | 'seat_limit_exceeded'
  | (string & {});

export type ImportIssueSeverity = 'warning' | 'blocked';

export type ImportRowStatus =
  | 'ready'
  | 'warning'
  | 'needsConfirmation'
  | 'blocked'
  | 'deleted'
  | 'skipped'
  | 'success'
  | 'failed';

export interface ImportIssue {
  code: ImportIssueCode;
  severity: ImportIssueSeverity | (string & {});
  message: string;
}

export interface ImportCsvRow {
  id: string;
  backendRowId?: string;
  rowNumber: number;
  email: string;
  name: string;
  department: string;
  action: ImportAction | string;
  userKey: string;
  deleted: boolean;
  issues: ImportIssue[];
  status: ImportRowStatus;
}

export interface ImportedCsvFile {
  name: string;
  content: string;
}

export interface ImportSummary {
  totalRows: number;
  activeRows: number;
  readyRows: number;
  warningRows: number;
  blockedRows: number;
  deletedRows: number;
  skippedRows: number;
}

export interface ImportResultSummary {
  successRows: number;
  failedRows: number;
  skippedRows: number;
  processedRows: number;
}
