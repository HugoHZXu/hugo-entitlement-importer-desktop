// @vitest-environment node

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEMO_ACCOUNT_STORAGE_KEY,
  DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY,
  IDENTITY_ACCESS_TOKEN_STORAGE_KEY,
  type DemoAccount,
} from '@/shared/types';
import { useIdentitySessionStore } from './identity-session-store';

function createAccount(
  id: string,
  organizations: Array<{ id: string; status?: string }> = [{ id: 'org-demo-001' }]
): DemoAccount {
  return {
    accountStatus: 'active',
    capabilities: {
      orgManagement: false,
      userManagement: false,
    },
    displayName: `Demo Admin ${id}`,
    email: `${id}@example.com`,
    entitlementOrganizations: organizations.map((organization) => ({
      id: organization.id,
      kind: 'tenant',
      name: `Demo Organization ${organization.id}`,
      status: organization.status ?? 'active',
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

function mockIdentitySession(account: DemoAccount, token = `${account.id}-token`) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      jsonResponse({
        accounts: [account],
        defaultAccountId: account.id,
      })
    )
    .mockResolvedValueOnce(
      jsonResponse({
        access_token: token,
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        expires_in: 3600,
        token_type: 'Bearer',
      })
    );
}

describe('identity session store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    setActivePinia(createPinia());
    vi.stubGlobal('window', {
      localStorage: createMemoryStorage(),
    });
  });

  it('initializes the selected account, token, and first active entitlement organization', async () => {
    const account = createAccount('user-entitlement-admin', [
      { id: 'org-inactive', status: 'inactive' },
      { id: 'org-active', status: 'active' },
    ]);

    vi.stubGlobal('fetch', mockIdentitySession(account));

    const store = useIdentitySessionStore();
    await store.initialize();

    expect(store.currentAccount?.id).toBe('user-entitlement-admin');
    expect(store.selectedEntitlementOrganizationId).toBe('org-active');
    expect(store.hasUsableEntitlementScope).toBe(true);
    expect(window.localStorage.getItem(DEMO_ACCOUNT_STORAGE_KEY)).toBe('user-entitlement-admin');
    expect(window.localStorage.getItem(DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY)).toBe(
      'org-active'
    );
    expect(window.localStorage.getItem(IDENTITY_ACCESS_TOKEN_STORAGE_KEY)).toBe(
      'user-entitlement-admin-token'
    );
  });

  it('does not refresh an expired token for service requests', () => {
    const account = createAccount('user-entitlement-admin');
    const store = useIdentitySessionStore();

    store.applySession(
      {
        accessToken: 'expired-token',
        accounts: [account],
        capabilities: account.capabilities,
        currentAccount: account,
        entitlementOrganizations: account.entitlementOrganizations,
        expiresAt: '2000-01-01T00:00:00.000Z',
        tokenType: 'Bearer',
      },
      account.id
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(store.getCurrentAccessToken()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
