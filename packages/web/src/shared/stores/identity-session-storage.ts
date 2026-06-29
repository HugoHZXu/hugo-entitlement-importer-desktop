import {
  DEMO_ACCOUNT_STORAGE_KEY,
  DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY,
  IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  IDENTITY_ACCESS_TOKEN_STORAGE_KEY,
} from '@/shared/types';

function getLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readStorageValue(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): void {
  try {
    getLocalStorage()?.setItem(key, value);
  } catch {
    // Storage can be unavailable; the in-memory session remains usable.
  }
}

function clearStorageValue(key: string): void {
  try {
    getLocalStorage()?.removeItem(key);
  } catch {
    // Storage can be unavailable; clearing in-memory state remains enough.
  }
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const expiresAtTime = Date.parse(expiresAt);

  return Number.isNaN(expiresAtTime) || expiresAtTime <= Date.now();
}

export function readStoredAccountId(): string | null {
  return readStorageValue(DEMO_ACCOUNT_STORAGE_KEY);
}

export function writeStoredAccountId(accountId: string): void {
  writeStorageValue(DEMO_ACCOUNT_STORAGE_KEY, accountId);
}

export function clearStoredAccountId(): void {
  clearStorageValue(DEMO_ACCOUNT_STORAGE_KEY);
}

export function readStoredEntitlementOrganizationId(): string | null {
  return readStorageValue(DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY);
}

export function writeStoredEntitlementOrganizationId(organizationId: string): void {
  writeStorageValue(DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY, organizationId);
}

export function clearStoredEntitlementOrganizationId(): void {
  clearStorageValue(DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY);
}

export function readStoredIdentityAccessToken(): string | null {
  try {
    const storage = getLocalStorage();
    const accessToken = storage?.getItem(IDENTITY_ACCESS_TOKEN_STORAGE_KEY) ?? null;
    const expiresAt = storage?.getItem(IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY) ?? null;

    if (!accessToken || isExpired(expiresAt)) {
      return null;
    }

    return accessToken;
  } catch {
    return null;
  }
}

export function writeStoredIdentityToken({
  accessToken,
  expiresAt,
}: {
  accessToken: string;
  expiresAt: string;
}): void {
  writeStorageValue(IDENTITY_ACCESS_TOKEN_STORAGE_KEY, accessToken);
  writeStorageValue(IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY, expiresAt);
}

export function clearStoredIdentityToken(): void {
  clearStorageValue(IDENTITY_ACCESS_TOKEN_STORAGE_KEY);
  clearStorageValue(IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY);
}
