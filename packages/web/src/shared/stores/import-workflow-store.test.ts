// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useImportWorkflowStore } from './import-workflow-store';

describe('import workflow store row editing', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps other backend validation issues when one row is edited', () => {
    const store = useImportWorkflowStore();

    store.selectedJobId = 'bulk-import-job-1';
    store.rows = [
      {
        action: 'assign',
        backendRowId: 'backend-row-1',
        deleted: false,
        department: 'Product',
        email: 'bad-email-format',
        id: 'row-1',
        issues: [
          {
            code: 'invalid_email',
            severity: 'blocked',
            message: 'Email format is invalid.',
          },
        ],
        name: 'Bad Email',
        rowNumber: 2,
        status: 'blocked',
        userKey: 'bad-email-format',
      },
      {
        action: 'assign',
        backendRowId: 'backend-row-2',
        deleted: false,
        department: 'Finance',
        email: 'capacity@example.com',
        id: 'row-2',
        issues: [
          {
            code: 'seat_limit_exceeded',
            severity: 'blocked',
            message: 'Import would exceed the entitlement seat limit.',
          },
        ],
        name: 'Capacity User',
        rowNumber: 3,
        status: 'blocked',
        userKey: 'capacity@example.com',
      },
      {
        action: 'assign',
        backendRowId: 'backend-row-3',
        deleted: false,
        department: 'Support',
        email: 'allocated@example.com',
        id: 'row-3',
        issues: [
          {
            code: 'already_allocated',
            severity: 'warning',
            message: 'User is already allocated to this entitlement.',
          },
        ],
        name: 'Allocated User',
        rowNumber: 4,
        status: 'skipped',
        userKey: 'allocated@example.com',
      },
    ];

    store.updateRow('row-1', { email: 'fixed@example.com' });

    expect(store.selectedJobId).toBeNull();
    expect(store.rows.find((row) => row.id === 'row-1')).toEqual(
      expect.objectContaining({
        email: 'fixed@example.com',
        issues: [],
        status: 'ready',
      })
    );
    expect(store.rows.find((row) => row.id === 'row-2')).toEqual(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            code: 'seat_limit_exceeded',
            severity: 'warning',
          }),
        ],
        status: 'warning',
      })
    );
    expect(store.rows.find((row) => row.id === 'row-3')).toEqual(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            code: 'already_allocated',
            severity: 'warning',
          }),
        ],
        status: 'skipped',
      })
    );
  });

  it('normalizes backend duplicate results so every duplicate row is blocked', () => {
    const store = useImportWorkflowStore();

    store.applyBackendJob(
      {
        allocatedBefore: 0,
        blockedRows: 1,
        canCancel: true,
        canCommit: false,
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
        nextPollAfterMs: null,
        needsConfirmationRows: 0,
        organizationId: 'org-demo-001',
        orgProductEntitlementId: 'ent-insight-studio-2026-001',
        phase: 'awaiting_review',
        processedRows: 2,
        productId: 'prod-insight-studio',
        productName: 'Insight Studio',
        progressPercent: 60,
        projectedAllocatedQuantity: 0,
        projectedAvailableQuantity: 10,
        purchasedQuantity: 10,
        readyRows: 1,
        rows: [],
        skippedRows: 0,
        startedAt: null,
        status: 'validated',
        successRows: 0,
        totalRows: 2,
        unregisteredSeatQuantity: 0,
        unregisteredUserCount: 0,
        validatedAt: '2026-06-30T00:00:00.000Z',
        warningRows: 0,
      },
      [
        {
          action: 'assign',
          allocationId: null,
          department: 'Product',
          email: 'duplicate@example.com',
          id: 'backend-row-1',
          issues: [],
          jobId: 'bulk-import-job-1',
          name: 'First User',
          normalizedEmail: 'duplicate@example.com',
          organizationMembershipId: null,
          rowNumber: 2,
          status: 'ready',
        },
        {
          action: 'assign',
          allocationId: null,
          department: 'Product',
          email: 'duplicate@example.com',
          id: 'backend-row-2',
          issues: [
            {
              code: 'duplicate_email_in_file',
              severity: 'blocked',
              message: 'Duplicate email appears earlier in the file.',
            },
          ],
          jobId: 'bulk-import-job-1',
          name: 'Second User',
          normalizedEmail: 'duplicate@example.com',
          organizationMembershipId: null,
          rowNumber: 3,
          status: 'blocked',
        },
      ]
    );

    expect(store.rows).toEqual([
      expect.objectContaining({
        id: 'backend-row-1',
        status: 'blocked',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_email_in_file',
            severity: 'blocked',
          }),
        ]),
      }),
      expect.objectContaining({
        id: 'backend-row-2',
        status: 'blocked',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_email_in_file',
            severity: 'blocked',
          }),
        ]),
      }),
    ]);
  });

  it('keeps backend needs-confirmation rows as confirmable rows', () => {
    const store = useImportWorkflowStore();

    store.applyBackendJob(
      {
        allocatedBefore: 0,
        blockedRows: 0,
        canCancel: true,
        canCommit: false,
        canConfirmImportRows: true,
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
        needsConfirmationRows: 1,
        nextPollAfterMs: null,
        organizationId: 'org-demo-001',
        orgProductEntitlementId: 'ent-insight-studio-2026-001',
        phase: 'awaiting_unregistered_user_confirmation',
        processedRows: 1,
        productId: 'prod-insight-studio',
        productName: 'Insight Studio',
        progressPercent: 60,
        projectedAllocatedQuantity: 1,
        projectedAvailableQuantity: 9,
        purchasedQuantity: 10,
        readyRows: 0,
        rows: [],
        skippedRows: 0,
        startedAt: null,
        status: 'awaitingConfirmation',
        successRows: 0,
        totalRows: 1,
        unregisteredSeatQuantity: 0,
        unregisteredUserCount: 0,
        validatedAt: '2026-06-30T00:00:00.000Z',
        warningRows: 0,
      },
      [
        {
          action: 'assign',
          allocationId: null,
          department: 'Sales',
          email: 'external.existing@example.com',
          id: 'backend-row-1',
          issues: [
            {
              code: 'user_not_in_organization',
              severity: 'warning',
              message: 'Requires confirmation.',
            },
          ],
          jobId: 'bulk-import-job-1',
          name: 'External Existing',
          normalizedEmail: 'external.existing@example.com',
          organizationMembershipId: null,
          rowNumber: 2,
          status: 'needsConfirmation',
        },
      ]
    );

    expect(store.validationComplete).toBe(true);
    expect(store.canCommit).toBe(true);
    expect(store.rows[0]).toEqual(
      expect.objectContaining({
        status: 'needsConfirmation',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'user_not_in_organization',
            severity: 'warning',
          }),
        ]),
      })
    );
  });

  it('does not allow commit when backend reports blocked rows', () => {
    const store = useImportWorkflowStore();

    store.currentJob = {
      allocatedBefore: 0,
      blockedRows: 1,
      canCancel: true,
      canCommit: true,
      canConfirmImportRows: true,
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
      needsConfirmationRows: 1,
      nextPollAfterMs: null,
      organizationId: 'org-demo-001',
      orgProductEntitlementId: 'ent-insight-studio-2026-001',
      phase: 'awaiting_unregistered_user_confirmation',
      processedRows: 2,
      productId: 'prod-insight-studio',
      productName: 'Insight Studio',
      progressPercent: 60,
      projectedAllocatedQuantity: 1,
      projectedAvailableQuantity: 9,
      purchasedQuantity: 10,
      readyRows: 1,
      rows: [],
      skippedRows: 0,
      startedAt: null,
      status: 'awaitingConfirmation',
      successRows: 0,
      totalRows: 2,
      unregisteredSeatQuantity: 0,
      unregisteredUserCount: 0,
      validatedAt: '2026-06-30T00:00:00.000Z',
      warningRows: 0,
    };

    expect(store.canCommit).toBe(false);
  });
});
