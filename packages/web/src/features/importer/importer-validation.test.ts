// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { parseImportCsv } from './importer-validation';

describe('importer validation', () => {
  it('marks every duplicate email row as blocked', () => {
    const rows = parseImportCsv(`email,name,department,action
duplicate@example.com,First User,Product,assign
duplicate@example.com,Second User,Product,assign`);

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === 'blocked')).toBe(true);
    expect(rows).toEqual([
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_email_in_file',
            severity: 'blocked',
          }),
        ]),
      }),
      expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_email_in_file',
            severity: 'blocked',
          }),
        ]),
      }),
    ]);
  });

  it('marks malformed email rows as blocked before backend validation', () => {
    const rows = parseImportCsv(`email,name,department,action
invalid-email-format,Invalid Email,Quality,assign`);

    expect(rows[0]).toEqual(
      expect.objectContaining({
        status: 'blocked',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_email',
            severity: 'blocked',
          }),
        ]),
      })
    );
  });
});
