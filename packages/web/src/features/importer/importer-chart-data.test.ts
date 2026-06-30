// @vitest-environment node

import { describe, expect, it } from 'vitest';

import type { BulkImportJobDetail } from '@/shared/types';

import { buildReviewChartsPayload } from './importer-chart-data';
import type { ImportCsvRow } from './importer-types';

function createRow(partial: Partial<ImportCsvRow> = {}): ImportCsvRow {
  const rowNumber = partial.rowNumber ?? 2;
  const email = partial.email ?? `user-${rowNumber}@example.com`;

  return {
    action: 'assign',
    deleted: false,
    department: 'Product',
    email,
    id: partial.id ?? `row-${rowNumber}`,
    issues: [],
    name: 'Test User',
    rowNumber,
    status: 'ready',
    userKey: email.toLowerCase(),
    ...partial,
  };
}

function createJob(overrides: Partial<BulkImportJobDetail> = {}): BulkImportJobDetail {
  return {
    allocatedBefore: 4,
    blockedRows: 0,
    canCancel: true,
    canCommit: true,
    canConfirmImportRows: false,
    canDownloadResults: false,
    canValidate: false,
    cancelRequestedAt: null,
    committedAt: null,
    completedAt: null,
    createdAt: '2026-06-30T00:00:00.000Z',
    errorMessage: null,
    failedRows: 0,
    fileName: 'import.csv',
    id: 'bulk-import-job-1',
    lastHeartbeatAt: null,
    needsConfirmationRows: 0,
    nextPollAfterMs: null,
    organizationId: 'org-demo-001',
    orgProductEntitlementId: 'ent-insight-studio-2026-001',
    phase: 'awaiting_review',
    processedRows: 0,
    productId: 'prod-insight-studio',
    productName: 'Insight Studio',
    progressPercent: 60,
    projectedAllocatedQuantity: 4,
    projectedAvailableQuantity: 6,
    purchasedQuantity: 10,
    readyRows: 0,
    rows: [],
    skippedRows: 0,
    startedAt: null,
    status: 'readyToCommit',
    successRows: 0,
    totalRows: 0,
    unregisteredSeatQuantity: 0,
    unregisteredUserCount: 0,
    validatedAt: '2026-06-30T00:00:00.000Z',
    warningRows: 0,
    ...overrides,
  };
}

describe('review chart payload', () => {
  it('uses backend validation projection and separates confirmation rows', () => {
    const payload = buildReviewChartsPayload({
      entitlement: {
        allocatedQuantity: 99,
        entitlementCode: 'ent-insight-studio-2026-001',
        name: 'Insight Studio',
        purchasedQuantity: 99,
      },
      job: createJob({
        allocatedBefore: 4,
        blockedRows: 1,
        needsConfirmationRows: 1,
        projectedAllocatedQuantity: 6,
        projectedAvailableQuantity: 4,
        readyRows: 1,
        skippedRows: 1,
        totalRows: 4,
      }),
      rows: [
        createRow({ id: 'ready-row', rowNumber: 2, status: 'ready' }),
        createRow({
          id: 'confirm-row',
          issues: [
            {
              code: 'user_not_in_organization',
              message: 'Requires confirmation.',
              severity: 'warning',
            },
          ],
          rowNumber: 3,
          status: 'needsConfirmation',
        }),
        createRow({
          id: 'skipped-row',
          issues: [
            {
              code: 'already_allocated',
              message: 'Already allocated.',
              severity: 'warning',
            },
          ],
          rowNumber: 4,
          status: 'skipped',
        }),
        createRow({
          action: 'revoke',
          id: 'blocked-row',
          issues: [
            {
              code: 'membership_not_found',
              message: 'Membership not found.',
              severity: 'blocked',
            },
          ],
          rowNumber: 5,
          status: 'blocked',
        }),
      ],
    });

    expect(payload.seatProjectionSource).toBe('backendValidation');
    expect(payload.summary).toEqual(
      expect.objectContaining({
        blockedRows: 1,
        importableRows: 2,
        needsConfirmationRows: 1,
        readyRows: 1,
        skippedRows: 1,
      })
    );
    expect(payload.statusDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'needsConfirmation', value: 1 }),
        expect.objectContaining({ id: 'skipped', value: 1 }),
        expect.objectContaining({ id: 'blocked', value: 1 }),
      ])
    );
    expect(payload.seatImpact).toEqual(
      expect.objectContaining({
        availableAfterImport: 4,
        currentAllocated: 4,
        plannedAssign: 2,
        plannedRevoke: 0,
        projectedAllocated: 6,
        purchasedQuantity: 10,
      })
    );
  });

  it('does not replace backend capacity projection with local assign row count', () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      createRow({
        id: `ready-row-${index + 1}`,
        rowNumber: index + 2,
        status: 'ready',
      })
    );
    const payload = buildReviewChartsPayload({
      entitlement: {
        allocatedQuantity: 0,
        entitlementCode: 'ent-insight-studio-2026-001',
        name: 'Insight Studio',
        purchasedQuantity: 3,
      },
      job: createJob({
        allocatedBefore: 0,
        projectedAllocatedQuantity: 3,
        projectedAvailableQuantity: 0,
        purchasedQuantity: 3,
        readyRows: 5,
        totalRows: 5,
      }),
      rows,
    });

    expect(payload.seatImpact.plannedAssign).toBe(5);
    expect(payload.seatImpact.projectedAllocated).toBe(3);
    expect(payload.seatImpact.availableAfterImport).toBe(0);
  });
});
