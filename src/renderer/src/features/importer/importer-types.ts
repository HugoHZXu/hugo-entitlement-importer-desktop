export type ImportAction = 'assign' | 'revoke';

export type ImportIssueCode =
  | 'missing_email'
  | 'invalid_email'
  | 'invalid_action'
  | 'invalid_seat_quantity'
  | 'duplicate_email_in_file'
  | 'conflicting_actions_in_file';

export type ImportIssueSeverity = 'warning' | 'blocked';

export type ImportRowStatus = 'ready' | 'warning' | 'blocked' | 'deleted';

export interface ImportIssue {
  code: ImportIssueCode;
  severity: ImportIssueSeverity;
  message: string;
}

export interface ImportCsvRow {
  id: string;
  rowNumber: number;
  email: string;
  name: string;
  department: string;
  action: ImportAction | string;
  seatQuantity: number | null;
  note: string;
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

