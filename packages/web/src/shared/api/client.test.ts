// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  IDENTITY_ACCESS_TOKEN_STORAGE_KEY,
} from '@/shared/types';
import {
  createBulkImportJob,
  downloadBulkImportArtifact,
  downloadBulkImportArtifactsZip,
  downloadBulkImportArtifactsZipUrl,
  getBulkImportHistoryDetail,
  getBulkImportJob,
  listEntitlements,
  listBulkImportJobRows,
  listBulkImportJobs,
  listProducts,
  commitBulkImportJob,
  validateBulkImportJob,
} from './client';

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

function textResponse(payload: string, status = 200) {
  return new Response(payload, {
    headers: {
      'Content-Type': 'text/plain',
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
    canConfirmImportRows: false,
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
    needsConfirmationRows: 0,
    organizationId: 'org-demo-001',
    orgProductEntitlementId: 'ent-insight-studio-2026-001',
    phase: 'rows_staged',
    processedRows: 0,
    productId: 'prod-insight-studio',
    productName: 'Insight Studio',
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
    unregisteredSeatQuantity: 0,
    unregisteredUserCount: 0,
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
      canManageOrganizationMembership: true,
      organizationId: 'org-demo-001',
      orgProductEntitlementId: 'ent-insight-studio-2026-001',
      productId: 'prod-insight-studio',
      rows: [
        {
          action: 'assign',
          email: 'lee.carter@example.com',
          rowNumber: 2,
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

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));

    expect(body.rows[0]).not.toHaveProperty('seatQuantity');
    expect(body.canManageOrganizationMembership).toBe(true);
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

  it('sends confirmation when committing jobs with confirmation rows', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        ...createJobPayload(),
        canDownloadResults: true,
        status: 'completed',
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      commitBulkImportJob('bulk-import-job-1', {
        confirmImportRows: true,
      })
    ).resolves.toMatchObject({
      id: 'bulk-import-job-1',
      status: 'completed',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/commit',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      })
    );

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));

    expect(body).toEqual({
      confirmImportRows: true,
    });
  });

  it('loads jobs without browser cache during polling', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(createJobPayload()));

    vi.stubGlobal('fetch', fetchMock);

    await expect(getBulkImportJob('bulk-import-job-1')).resolves.toMatchObject({
      id: 'bulk-import-job-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('lists bulk import history with pagination filters', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            ...createJobPayload(),
            rows: undefined,
            status: 'completed',
          },
        ],
        pageNumber: 2,
        pageSize: 10,
        totalElements: 21,
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      listBulkImportJobs({
        organizationId: 'org-demo-001',
        pageNumber: 2,
        pageSize: 10,
        productId: 'prod-insight-studio',
        status: 'completed',
      })
    ).resolves.toMatchObject({
      items: [
        {
          id: 'bulk-import-job-1',
          status: 'completed',
        },
      ],
      totalElements: 21,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/organizations/org-demo-001/bulk-import-jobs?pageNumber=2&pageSize=10&productId=prod-insight-studio&status=completed',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('loads the backend history detail aggregate', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        download: {
          artifactZipUrl: '/bulk-import-jobs/bulk-import-job-1/artifacts.zip',
          canDownloadResults: true,
        },
        issueReasons: [],
        job: {
          ...createJobPayload(),
          canDownloadResults: true,
          status: 'completed',
        },
        resultBreakdown: [
          { count: 1, id: 'success', label: 'Success', statuses: ['success'] },
          {
            count: 0,
            id: 'needsConfirmation',
            label: 'Needs confirmation',
            statuses: ['needsConfirmation'],
          },
          { count: 0, id: 'skipped', label: 'Skipped', statuses: ['skipped'] },
          { count: 0, id: 'failed', label: 'Failed', statuses: ['failed', 'blocked'] },
        ],
        resultSummary: {
          blockedRows: 0,
          failedOrBlockedRows: 0,
          failedRows: 0,
          processedRows: 1,
          needsConfirmationRows: 0,
          reviewItemRows: 0,
          skippedRows: 0,
          successRows: 1,
          totalRows: 1,
          unregisteredSeatQuantity: 0,
          unregisteredUserCount: 0,
        },
        seatImpact: {
          assignedSeats: 1,
          occupiedAfter: 29,
          occupiedBefore: 28,
          occupiedPercentAfter: 39,
          purchasedQuantity: 75,
          remainingAfter: 46,
          revokedSeats: 0,
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getBulkImportHistoryDetail('bulk-import-job-1')).resolves.toMatchObject({
      download: {
        canDownloadResults: true,
      },
      job: {
        id: 'bulk-import-job-1',
      },
      resultSummary: {
        successRows: 1,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/history-detail',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('normalizes paged row responses from the backend', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            action: 'assign',
            allocationId: null,
            department: 'Analytics',
            email: 'lee.carter@example.com',
            id: 'bulk-import-row-1',
            issues: [],
            jobId: 'bulk-import-job-1',
            name: 'Lee Carter',
            normalizedEmail: 'lee.carter@example.com',
            organizationMembershipId: 'membership-1',
            rowNumber: 2,
            status: 'ready',
          },
        ],
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(listBulkImportJobRows('bulk-import-job-1')).resolves.toMatchObject([
      {
        id: 'bulk-import-row-1',
        status: 'ready',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/rows',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
  });

  it('queries failed rows with backend row filters', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        items: [],
        pageNumber: 0,
        pageSize: 50,
        totalElements: 0,
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      listBulkImportJobRows({
        jobId: 'bulk-import-job-1',
        pageNumber: 0,
        pageSize: 50,
        status: 'failed',
      })
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/rows?pageNumber=0&pageSize=50&status=failed',
      expect.objectContaining({
        cache: 'no-store',
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

  it('loads product entitlements through GraphQL with product and organization scope', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        data: {
          entitlements: [
            {
              allocatedQuantity: 28,
              endDate: '2026-12-31',
              entitlementCode: 'LIC-INSIGHT-STUDIO-2026',
              id: 'ent-insight-studio-2026-001',
              productId: 'prod-insight-studio',
              purchasedQuantity: 75,
              source: 'contract',
              startDate: '2026-01-01',
              status: 'active',
              usageDimensionCode: 'named_user_count',
            },
          ],
        },
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      listEntitlements({
        organizationId: 'org-demo-001',
        productId: 'prod-insight-studio',
      })
    ).resolves.toMatchObject([
      {
        id: 'ent-insight-studio-2026-001',
        productId: 'prod-insight-studio',
      },
    ]);

    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const init = firstCall[1];
    expect(JSON.parse(String(init.body))).toMatchObject({
      variables: {
        organizationId: 'org-demo-001',
        productId: 'prod-insight-studio',
      },
    });
  });

  it('surfaces raw text when a non-json artifact request fails', async () => {
    const fetchMock = vi.fn(async () => textResponse('Artifact is not ready.', 409));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      downloadBulkImportArtifact({
        artifact: 'report',
        jobId: 'bulk-import-job-1',
      })
    ).rejects.toThrow('Artifact is not ready.');
  });

  it('downloads the result package zip from the backend artifact endpoint', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('zip-content', {
          headers: {
            'Content-Type': 'application/zip',
          },
        })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadBulkImportArtifactsZip('bulk-import-job-1')).resolves.toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/artifacts.zip',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/zip',
        }),
      })
    );
  });

  it('downloads the result package zip from the history detail artifact url', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('zip-content', {
          headers: {
            'Content-Type': 'application/zip',
          },
        })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      downloadBulkImportArtifactsZipUrl('/bulk-import-jobs/bulk-import-job-1/artifacts.zip')
    ).resolves.toBeInstanceOf(Blob);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4317/bulk-import-jobs/bulk-import-job-1/artifacts.zip',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/zip',
        }),
      })
    );
  });

  it('surfaces backend readiness errors when the result package is not downloadable', async () => {
    const fetchMock = vi.fn(async () => textResponse('Artifacts are not ready.', 409));

    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadBulkImportArtifactsZip('bulk-import-job-1')).rejects.toThrow(
      'Artifacts are not ready.'
    );
  });
});
