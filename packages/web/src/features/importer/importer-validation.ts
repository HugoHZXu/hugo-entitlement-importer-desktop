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

const issueMessages: Record<ImportIssueCode, string> = {
  missing_email: 'Email is required.',
  invalid_email: 'Email format is invalid.',
  invalid_action: 'Action must be assign or revoke.',
  invalid_seat_quantity: 'Seat quantity must be a positive whole number.',
  duplicate_email_in_file: 'This user appears more than once in this file.',
  conflicting_actions_in_file: 'This user has both assign and revoke actions in this file.',
};

const issueSeverity: Record<ImportIssueCode, ImportIssueSeverity> = {
  missing_email: 'blocked',
  invalid_email: 'blocked',
  invalid_action: 'blocked',
  invalid_seat_quantity: 'blocked',
  duplicate_email_in_file: 'warning',
  conflicting_actions_in_file: 'blocked',
};

function createIssue(code: ImportIssueCode): ImportIssue {
  return {
    code,
    severity: issueSeverity[code],
    message: issueMessages[code],
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

function normalizeAction(value: unknown): ImportAction | string {
  const action = String(value ?? '').trim().toLowerCase();
  return action === '' ? 'assign' : action;
}

function normalizeSeatQuantity(value: unknown): number | null {
  const rawValue = String(value ?? '').trim();

  if (rawValue === '') {
    return 1;
  }

  const parsedValue = Number(rawValue);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function resolveStatus(row: ImportCsvRow): ImportRowStatus {
  if (row.deleted) {
    return 'deleted';
  }

  if (row.issues.some((issue) => issue.severity === 'blocked')) {
    return 'blocked';
  }

  if (row.issues.some((issue) => issue.severity === 'warning')) {
    return 'warning';
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

  if (row.seatQuantity === null) {
    addIssue(row, 'invalid_seat_quantity');
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

    rowsForUser.slice(1).forEach((row) => addIssue(row, 'duplicate_email_in_file'));
  }
}

export function normalizeImportRows(rows: ImportCsvRow[]): ImportCsvRow[] {
  const normalizedRows = rows.map((row) => ({
    ...row,
    email: row.email.trim(),
    name: row.name.trim(),
    department: row.department.trim(),
    action: normalizeAction(row.action),
    note: row.note.trim(),
    userKey: row.email.trim().toLowerCase(),
    issues: [] as ImportIssue[],
  }));

  normalizedRows.forEach(validateSingleRow);
  validateDuplicateRows(normalizedRows);

  return normalizedRows.map((row) => ({
    ...row,
    status: resolveStatus(row),
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
      seatQuantity: normalizeSeatQuantity(row.seatQuantity),
      note: String(row.note ?? ''),
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
    readyRows: activeRows.filter((row) => row.status === 'ready').length,
    warningRows: activeRows.filter((row) => row.status === 'warning').length,
    blockedRows: activeRows.filter((row) => row.status === 'blocked').length,
    deletedRows: rows.filter((row) => row.deleted).length,
    skippedRows: activeRows.filter((row) => row.status === 'warning').length,
  };
}

export function summarizeImportResult(rows: ImportCsvRow[]): ImportResultSummary {
  const summary = summarizeImportRows(rows);

  return {
    successRows: summary.readyRows,
    failedRows: summary.blockedRows,
    skippedRows: summary.skippedRows,
    processedRows: summary.activeRows,
  };
}

export function cloneRowWithPatch(
  row: ImportCsvRow,
  patch: Partial<Pick<ImportCsvRow, 'email' | 'name' | 'department' | 'action' | 'seatQuantity' | 'note'>>
): ImportCsvRow {
  return {
    ...row,
    ...patch,
  };
}

