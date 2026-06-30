import { getIdentityServiceUrl } from '@/shared/config/identity-service';
import { translate } from '@/shared/i18n';
import type {
  DemoAccount,
  DemoAccountsResponse,
  DemoIdentitySession,
  DemoTokenResponse,
  IdentityUserInfo,
} from '@/shared/types';

export interface FetchIdentitySessionInput {
  selectedAccountId?: string | null;
}

interface IdentityErrorPayload {
  error?: string;
  message?: string;
}

export class IdentityServiceError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor({ status, code, message }: { status: number; code?: string | null; message: string }) {
    super(message);
    this.name = 'IdentityServiceError';
    this.status = status;
    this.code = code ?? null;
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getIdentityServiceUrl()}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === 'object' ? (payload as IdentityErrorPayload) : {};

    throw new IdentityServiceError({
      status: response.status,
      code: errorPayload.error ?? null,
      message: errorPayload.message ?? translate('errors.identityServiceRequestFailed'),
    });
  }

  return payload as T;
}

function resolveAccount({
  accounts,
  defaultAccountId,
  selectedAccountId,
}: DemoAccountsResponse & FetchIdentitySessionInput): DemoAccount | null {
  return (
    accounts.find((account) => account.id === selectedAccountId) ??
    accounts.find((account) => account.id === defaultAccountId) ??
    accounts[0] ??
    null
  );
}

function createSession({
  accounts,
  currentAccount,
  token,
}: {
  accounts: DemoAccount[];
  currentAccount: DemoAccount;
  token: DemoTokenResponse;
}): DemoIdentitySession {
  return {
    accounts,
    currentAccount,
    capabilities: currentAccount.capabilities,
    entitlementOrganizations: currentAccount.entitlementOrganizations,
    accessToken: token.access_token,
    tokenType: token.token_type,
    expiresAt: token.expires_at,
  };
}

export function fetchDemoAccounts(): Promise<DemoAccountsResponse> {
  return requestJson<DemoAccountsResponse>('/demo/accounts');
}

export function createDemoToken(userId: string): Promise<DemoTokenResponse> {
  return requestJson<DemoTokenResponse>('/demo/token', {
    body: JSON.stringify({ userId }),
    method: 'POST',
  });
}

export function fetchIdentityUserInfo(accessToken: string): Promise<IdentityUserInfo> {
  return requestJson<IdentityUserInfo>('/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function fetchIdentitySession({
  selectedAccountId = null,
}: FetchIdentitySessionInput = {}): Promise<DemoIdentitySession> {
  const accountsResponse = await fetchDemoAccounts();
  const currentAccount = resolveAccount({ ...accountsResponse, selectedAccountId });

  if (!currentAccount) {
    throw new IdentityServiceError({
      status: 500,
      code: 'DEMO_ACCOUNT_LIST_EMPTY',
      message: translate('errors.identityAccountListEmpty'),
    });
  }

  try {
    const token = await createDemoToken(currentAccount.id);

    return createSession({
      accounts: accountsResponse.accounts,
      currentAccount,
      token,
    });
  } catch (error) {
    if (
      error instanceof IdentityServiceError &&
      error.code === 'DEMO_ACCOUNT_NOT_FOUND' &&
      currentAccount.id !== accountsResponse.defaultAccountId
    ) {
      const fallbackAccount =
        accountsResponse.accounts.find((account) => account.id === accountsResponse.defaultAccountId) ??
        accountsResponse.accounts[0];

      if (fallbackAccount) {
        const token = await createDemoToken(fallbackAccount.id);

        return createSession({
          accounts: accountsResponse.accounts,
          currentAccount: fallbackAccount,
          token,
        });
      }
    }

    throw error;
  }
}
