// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DemoAccount } from '@/shared/types';
import {
  createDemoToken,
  fetchDemoAccounts,
  fetchIdentitySession,
  fetchIdentityUserInfo,
  IdentityServiceError,
} from './identity-api';

function createAccount(id: string, entitlementOrganizations = ['org-demo-001']): DemoAccount {
  return {
    accountStatus: 'active',
    capabilities: {
      orgManagement: false,
      userManagement: false,
    },
    displayName: `Demo Admin ${id}`,
    email: `${id}@example.com`,
    entitlementOrganizations: entitlementOrganizations.map((organizationId) => ({
      id: organizationId,
      kind: 'tenant',
      name: `Demo Organization ${organizationId}`,
      status: 'active',
    })),
    firstName: 'Demo',
    id,
    lastName: 'Admin',
    memberships: [],
    persona: 'Synthetic entitlement admin',
    userManagementOrganizations: [],
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

describe('identity service API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads switchable demo accounts from identity-service', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        accounts: [createAccount('user-entitlement-admin')],
        defaultAccountId: 'user-entitlement-admin',
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDemoAccounts()).resolves.toMatchObject({
      accounts: [
        expect.objectContaining({
          entitlementOrganizations: [
            expect.objectContaining({
              kind: 'tenant',
            }),
          ],
          id: 'user-entitlement-admin',
        }),
      ],
      defaultAccountId: 'user-entitlement-admin',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:4320/demo/accounts', {
      headers: {},
    });
  });

  it('requests demo token and userinfo with bearer auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'token-1',
          expires_at: '2099-01-01T00:00:00.000Z',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          accountStatus: 'active',
          capabilities: {
            orgManagement: false,
            userManagement: false,
          },
          email: 'user-entitlement-admin@example.com',
          entitlementOrganizations: [],
          name: 'Demo Admin',
          organizations: [],
          roles: ['entitlement_admin'],
          sub: 'user-entitlement-admin',
          userManagementOrganizations: [],
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(createDemoToken('user-entitlement-admin')).resolves.toMatchObject({
      access_token: 'token-1',
      token_type: 'Bearer',
    });
    await expect(fetchIdentityUserInfo('token-1')).resolves.toMatchObject({
      roles: ['entitlement_admin'],
      sub: 'user-entitlement-admin',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://127.0.0.1:4320/demo/token',
      expect.objectContaining({
        body: JSON.stringify({ userId: 'user-entitlement-admin' }),
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:4320/userinfo',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer token-1',
        },
      })
    );
  });

  it('falls back to the default account when selected token issuance reports account not found', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          accounts: [createAccount('user-default'), createAccount('user-missing')],
          defaultAccountId: 'user-default',
        })
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: 'DEMO_ACCOUNT_NOT_FOUND',
            message: 'Demo account was not found.',
          },
          404
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'default-token',
          expires_at: '2099-01-01T00:00:00.000Z',
          expires_in: 3600,
          token_type: 'Bearer',
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchIdentitySession({ selectedAccountId: 'user-missing' })).resolves.toMatchObject({
      accessToken: 'default-token',
      currentAccount: {
        id: 'user-default',
      },
    });
  });

  it('surfaces identity-service error payloads', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: 'IDENTITY_SERVICE_UNAVAILABLE',
          message: 'Identity service unavailable.',
        },
        503
      )
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDemoAccounts()).rejects.toMatchObject({
      code: 'IDENTITY_SERVICE_UNAVAILABLE',
      message: 'Identity service unavailable.',
      status: 503,
    } satisfies Partial<IdentityServiceError>);
  });
});
