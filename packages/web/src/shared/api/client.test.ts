// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  IDENTITY_ACCESS_TOKEN_STORAGE_KEY,
} from '@/shared/types';
import { createBulkImportJob, listProducts, validateBulkImportJob } from './client';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}

function createJobPayload() {
  return {
    allocatedBefore: 28,
    blockedRows: 0,
    canCancel: true,
    canCommit: false,
    canDownloadResults: false,
    canValidate: true,
    cancelRequestedAt: null,
    committedAt: null,
    completedAt: null,
    createdAt: '2026-06-30T00:00:00.000Z',
    errorMessage: null,
    failedRows: 0,
    fileName: 'import.csv',
    id: 'bulk-import-job-1',
    lastHeartbeatAt: '2026-06-30T00:00:00.000Z',
    nextPollAfterMs: null,
    organizationId: 'org-demo-001',
    orgProductEntitlementId: 'ent-insight-studio-2026-001',
    phase: 'rows_staged',
    processedRows: 0,
    productId: 'prod-insight-studio',
    progressPercent: 20,
    projectedAllocatedQuantity: 28,
    projectedAvailableQuantity: 47,
    purchasedQuantity: 75,
    readyRows: 0,
    rows: [],
    skippedRows: 0,
    startedAt: null,
    status: 'imported',
    successRows: 0,
    totalRows: 1,
    validatedAt: null,
    warningRows: 0,
  };
}

describe('bulk import API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates jobs under the selected organization and sends the stored identity token', async () => {
    const storage = createMemoryStorage();

    storage.setItem(IDENTITY_ACCESS_TOKEN_STORAGE_KEY, 'identity-token');
    storage.setItem(IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, '2099-01-01T00:00:00.000Z');
    vi.stubGlobal('window', {
      localStorage: storage,
    });

    const fetchMock = vi.fn(async () => jsonResponse(createJobPayload(), 201));
    vi.stubGlobal('fetch', fetchMock);

    await createBulkImportJob({
      fileName: 'import.csv',
      organizationId: 'org-demo-001',
      orgProductEntitlementId: 'ent-insight-studio-2026-001',
      productId: 'prod-insight-studio',
      rows: [
        {
          action: 'assign',
          email: 'lee.carter@example.com',
          rowNumber: 2,
          seatQuantity: 1,
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/organizations/org-demo-001/bulk-import-jobs',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer identity-token',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      })
    );
  });

  it('starts backend validation for an existing job', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        ...createJobPayload(),
        canCommit: true,
        phase: 'awaiting_review',
        status: 'readyToCommit',
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(validateBulkImportJob('bulk-import-job-1')).resolves.toMatchObject({
      id: 'bulk-import-job-1',
      status: 'readyToCommit',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/validate',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('loads available products through GraphQL with organization scope and identity token', async () => {
    const storage = createMemoryStorage();

    storage.setItem(IDENTITY_ACCESS_TOKEN_STORAGE_KEY, 'identity-token');
    storage.setItem(IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, '2099-01-01T00:00:00.000Z');
    vi.stubGlobal('window', {
      localStorage: storage,
    });

    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: {
          products: [
            {
              description: 'Analytics product granted through a contract license.',
              entitlementInfo: {
                allocationModel: 'Named-user allocation',
                entitlementCode: 'LIC-INSIGHT-STUDIO-2026',
                grantType: 'Contract license',
                renewalDate: '2027-01-14',
                subscriberAccountId: 'account-1001',
                subscriberId: 'subscriber-1001',
              },
              icon: 'insight-studio',
              id: 'prod-insight-studio',
              name: 'Insight Studio',
              provider: 'Licensing Catalog',
              status: 'active',
              supportedPlatforms: ['Desktop importer'],
              usageDimensions: [
                {
                  code: 'named_user_count',
                  description: 'Assignable named-user seats.',
                  name: 'Named users',
                  unit: 'seat',
                },
              ],
            },
          ],
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(listProducts({ organizationId: 'org-demo-001' })).resolves.toMatchObject([
      {
        id: 'prod-insight-studio',
        entitlementInfo: {
          entitlementCode: 'LIC-INSIGHT-STUDIO-2026',
        },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/graphql',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer identity-token',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      })
    );

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const init = firstCall[1];
    expect(JSON.parse(String(init.body))).toMatchObject({
      variables: {
        organizationId: 'org-demo-001',
      },
    });
  });
});
