import Papa from 'papaparse';

import type {
  ImportAction,
  ImportCsvRow,
  ImportIssue,
  ImportIssueCode,
  ImportIssueSeverity,
  ImportResultSummary,
  ImportRowStatus,
  ImportSummary,
} from './importer-types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ACTIONS = new Set<ImportAction>(['assign', 'revoke']);

const issueMessages: Record<string, string> = {
  missing_email: 'Email is required.',
  invalid_email: 'Email format is invalid.',
  invalid_action: 'Action must be assign or revoke.',
  duplicate_email_in_file: 'This user appears more than once in this file.',
  conflicting_actions_in_file: 'This user has both assign and revoke actions in this file.',
  unregistered_user:
    'Confirming will create an inactive user, add them to the organization, and reserve a seat.',
  user_not_in_organization:
    'Confirming will add this existing account to the organization and assign the entitlement.',
  membership_not_found: 'This email does not match an active organization membership.',
  entitlement_not_active: 'The selected entitlement is not active.',
  already_allocated: 'This user already has this entitlement.',
  not_allocated: 'This user does not have an active allocation to revoke.',
  seat_limit_exceeded: 'This import would exceed the available seat quantity.',
};

const issueSeverity: Record<string, ImportIssueSeverity> = {
  missing_email: 'blocked',
  invalid_email: 'blocked',
  invalid_action: 'blocked',
  duplicate_email_in_file: 'blocked',
  conflicting_actions_in_file: 'blocked',
  unregistered_user: 'warning',
  user_not_in_organization: 'warning',
  membership_not_found: 'blocked',
  entitlement_not_active: 'blocked',
  already_allocated: 'warning',
  not_allocated: 'blocked',
  seat_limit_exceeded: 'warning',
};

const localIssueCodes = new Set<string>([
  'missing_email',
  'invalid_email',
  'invalid_action',
  'duplicate_email_in_file',
  'conflicting_actions_in_file',
]);

type NormalizeImportRowsOptions = {
  preserveNonLocalIssues?: boolean;
  preserveStatuses?: boolean;
};

function createIssue(code: ImportIssueCode): ImportIssue {
  return {
    code,
    severity: issueSeverity[code] ?? 'blocked',
    message: issueMessages[code] ?? code.replaceAll('_', ' '),
  };
}

function hasIssue(row: ImportCsvRow, code: ImportIssueCode) {
  return row.issues.some((issue) => issue.code === code);
}

function addIssue(row: ImportCsvRow, code: ImportIssueCode) {
  if (!hasIssue(row, code)) {
    row.issues.push(createIssue(code));
  }
}

function isLocalIssue(issue: ImportIssue) {
  return localIssueCodes.has(issue.code);
}

function normalizePreservedIssue(issue: ImportIssue, rowStatus: ImportRowStatus): ImportIssue {
  if (issue.code === 'seat_limit_exceeded' && rowStatus !== 'failed') {
    return {
      ...issue,
      severity: 'warning',
    };
  }

  return issue;
}

function isBlockingIssue(issue: ImportIssue) {
  return issue.severity === 'blocked' && issue.code !== 'seat_limit_exceeded';
}

function normalizeAction(value: unknown): ImportAction | string {
  const action = String(value ?? '').trim().toLowerCase();
  return action === '' ? 'assign' : action;
}

function resolveStatus(row: ImportCsvRow, previousStatus?: ImportRowStatus): ImportRowStatus {
  if (row.deleted) {
    return 'deleted';
  }

  if (row.issues.some(isBlockingIssue)) {
    return 'blocked';
  }

  if (row.issues.some((issue) => issue.severity === 'warning')) {
    if (previousStatus === 'needsConfirmation') {
      return 'needsConfirmation';
    }

    if (previousStatus === 'skipped') {
      return 'skipped';
    }

    return 'warning';
  }

  if (previousStatus === 'success' || previousStatus === 'failed' || previousStatus === 'skipped') {
    return previousStatus;
  }

  return 'ready';
}

function validateSingleRow(row: ImportCsvRow) {
  if (!row.email) {
    addIssue(row, 'missing_email');
  } else if (!EMAIL_PATTERN.test(row.email)) {
    addIssue(row, 'invalid_email');
  }

  if (!VALID_ACTIONS.has(row.action as ImportAction)) {
    addIssue(row, 'invalid_action');
  }
}

function validateDuplicateRows(rows: ImportCsvRow[]) {
  const groupedRows = new Map<string, ImportCsvRow[]>();

  for (const row of rows) {
    if (row.deleted || !row.userKey) {
      continue;
    }

    const existingRows = groupedRows.get(row.userKey) ?? [];
    existingRows.push(row);
    groupedRows.set(row.userKey, existingRows);
  }

  for (const rowsForUser of groupedRows.values()) {
    if (rowsForUser.length < 2) {
      continue;
    }

    const validActions = new Set(
      rowsForUser
        .map((row) => row.action)
        .filter((action): action is ImportAction => VALID_ACTIONS.has(action as ImportAction))
    );

    if (validActions.size > 1) {
      rowsForUser.forEach((row) => addIssue(row, 'conflicting_actions_in_file'));
      continue;
    }

    rowsForUser.forEach((row) => addIssue(row, 'duplicate_email_in_file'));
  }
}

export function normalizeImportRows(
  rows: ImportCsvRow[],
  options: NormalizeImportRowsOptions = {}
): ImportCsvRow[] {
  const normalizedRows = rows.map((row) => ({
    ...row,
    email: row.email.trim(),
    name: row.name.trim(),
    department: row.department.trim(),
    action: normalizeAction(row.action),
    userKey: row.email.trim().toLowerCase(),
    issues: options.preserveNonLocalIssues
      ? row.issues
          .filter((issue) => !isLocalIssue(issue))
          .map((issue) => normalizePreservedIssue(issue, row.status))
      : ([] as ImportIssue[]),
  }));

  normalizedRows.forEach(validateSingleRow);
  validateDuplicateRows(normalizedRows);

  return normalizedRows.map((row, index) => ({
    ...row,
    status: resolveStatus(row, options.preserveStatuses ? rows[index]?.status : undefined),
  }));
}

export function parseImportCsv(content: string): ImportCsvRow[] {
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  return normalizeImportRows(
    parsed.data.map((row, index) => ({
      id: `csv-row-${index + 2}-${crypto.randomUUID()}`,
      rowNumber: index + 2,
      email: String(row.email ?? ''),
      name: String(row.name ?? ''),
      department: String(row.department ?? ''),
      action: normalizeAction(row.action),
      userKey: String(row.email ?? '').trim().toLowerCase(),
      deleted: false,
      issues: [],
      status: 'ready',
    }))
  );
}

export function summarizeImportRows(rows: ImportCsvRow[]): ImportSummary {
  const activeRows = rows.filter((row) => !row.deleted);

  return {
    totalRows: rows.length,
    activeRows: activeRows.length,
    readyRows: activeRows.filter((row) => row.status === 'ready' || row.status === 'success')
      .length,
    warningRows: activeRows.filter(
      (row) =>
        row.status === 'warning' ||
        row.status === 'skipped' ||
        row.status === 'needsConfirmation'
    ).length,
    blockedRows: activeRows.filter((row) => row.status === 'blocked' || row.status === 'failed')
      .length,
    deletedRows: rows.filter((row) => row.deleted).length,
    skippedRows: activeRows.filter((row) => row.status === 'warning' || row.status === 'skipped')
      .length,
  };
}

export function summarizeImportResult(rows: ImportCsvRow[]): ImportResultSummary {
  const summary = summarizeImportRows(rows);
  const activeRows = rows.filter((row) => !row.deleted);
  const hasFinalStatuses = activeRows.some((row) =>
    ['success', 'failed', 'skipped'].includes(row.status)
  );

  if (hasFinalStatuses) {
    return {
      successRows: activeRows.filter((row) => row.status === 'success').length,
      failedRows: activeRows.filter((row) => row.status === 'failed' || row.status === 'blocked')
        .length,
      skippedRows: activeRows.filter((row) => row.status === 'skipped' || row.status === 'warning')
        .length,
      processedRows: activeRows.length,
    };
  }

  return {
    successRows: summary.readyRows,
    failedRows: summary.blockedRows,
    skippedRows: summary.skippedRows,
    processedRows: summary.activeRows,
  };
}

export function cloneRowWithPatch(
  row: ImportCsvRow,
  patch: Partial<Pick<ImportCsvRow, 'email' | 'name' | 'department' | 'action'>>
): ImportCsvRow {
  return {
    ...row,
    ...patch,
  };
}
