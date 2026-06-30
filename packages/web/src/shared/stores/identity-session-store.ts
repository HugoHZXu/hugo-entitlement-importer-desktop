import { defineStore } from 'pinia';

import { fetchIdentitySession } from '@/shared/api/identity-api';
import { translate } from '@/shared/i18n';
import {
  clearStoredAccountId,
  clearStoredEntitlementOrganizationId,
  clearStoredIdentityToken,
  readStoredAccountId,
  readStoredEntitlementOrganizationId,
  readStoredIdentityAccessToken,
  writeStoredAccountId,
  writeStoredEntitlementOrganizationId,
  writeStoredIdentityToken,
} from '@/shared/stores/identity-session-storage';
import type {
  DemoAccount,
  DemoAccountMembership,
  DemoIdentitySession,
  DemoOrganizationScope,
  DemoOrganizationStatus,
  DemoRole,
} from '@/shared/types';

const ENTITLEMENT_IMPORT_ACCESS_ROLE_KEYS = new Set([
  'organization_admin',
  'entitlement_manager',
]);
const ORGANIZATION_MEMBERSHIP_MANAGER_ROLE_KEY = 'organization_admin';

interface IdentitySessionState {
  accounts: DemoAccount[];
  currentAccount: DemoAccount | null;
  selectedAccountId: string | null;
  accessToken: string | null;
  tokenType: 'Bearer' | null;
  expiresAt: string | null;
  entitlementOrganizations: DemoOrganizationScope[];
  selectedEntitlementOrganizationId: string | null;
  initialized: boolean;
  loading: boolean;
  switching: boolean;
  errorMessage: string | null;
  noticeMessage: string | null;
}

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }

  const expiresAtTime = Date.parse(expiresAt);

  return Number.isNaN(expiresAtTime) || expiresAtTime <= Date.now();
}

function isActiveStatus(status: DemoOrganizationStatus): boolean {
  return status === 'active';
}

function isActiveMembership(membership: DemoAccountMembership): boolean {
  return membership.membershipStatus.toLowerCase() === 'active';
}

function hasEntitlementImportAccessRole(role: DemoRole): boolean {
  return ENTITLEMENT_IMPORT_ACCESS_ROLE_KEYS.has(role.key);
}

function hasOrganizationMembershipManagerRole(role: DemoRole): boolean {
  return role.key === ORGANIZATION_MEMBERSHIP_MANAGER_ROLE_KEY;
}

function findEntitlementOrganizationMembership(
  account: DemoAccount,
  organizationId: string
): DemoAccountMembership | null {
  return (
    account.memberships.find((membership) => membership.organization.id === organizationId) ?? null
  );
}

export function canManageEntitlementOrganization(
  account: DemoAccount,
  organizationId: string
): boolean {
  const membership = findEntitlementOrganizationMembership(account, organizationId);

  return Boolean(
    membership &&
      isActiveMembership(membership) &&
      membership.roles.some(hasEntitlementImportAccessRole)
  );
}

export function canManageOrganizationMembership(
  account: DemoAccount,
  organizationId: string
): boolean {
  const membership = findEntitlementOrganizationMembership(account, organizationId);

  return Boolean(
    membership &&
      isActiveMembership(membership) &&
      membership.roles.some(hasOrganizationMembershipManagerRole)
  );
}

export function getManageableEntitlementOrganizations(
  account: DemoAccount
): DemoOrganizationScope[] {
  return account.entitlementOrganizations.filter((organization) =>
    canManageEntitlementOrganization(account, organization.id)
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return translate('errors.identitySessionUnavailable');
}

function selectEntitlementOrganizationId(
  organizations: DemoOrganizationScope[],
  preferredOrganizationId: string | null
): string | null {
  if (organizations.length === 0) {
    return null;
  }

  const preferredOrganization = organizations.find(
    (organization) => organization.id === preferredOrganizationId
  );

  if (preferredOrganization) {
    return preferredOrganization.id;
  }

  return (
    organizations.find((organization) => isActiveStatus(organization.status)) ??
    organizations[0] ??
    null
  )?.id ?? null;
}

function persistAccountId(accountId: string | null): void {
  if (accountId) {
    writeStoredAccountId(accountId);
    return;
  }

  clearStoredAccountId();
}

function persistEntitlementOrganizationId(organizationId: string | null): void {
  if (organizationId) {
    writeStoredEntitlementOrganizationId(organizationId);
    return;
  }

  clearStoredEntitlementOrganizationId();
}

export const useIdentitySessionStore = defineStore('identity-session', {
  state: (): IdentitySessionState => ({
    accounts: [],
    accessToken: null,
    currentAccount: null,
    entitlementOrganizations: [],
    errorMessage: null,
    expiresAt: null,
    initialized: false,
    loading: false,
    noticeMessage: null,
    selectedAccountId: readStoredAccountId(),
    selectedEntitlementOrganizationId: readStoredEntitlementOrganizationId(),
    switching: false,
    tokenType: null,
  }),
  getters: {
    activeEntitlementOrganization(state): DemoOrganizationScope | null {
      return (
        state.entitlementOrganizations.find(
          (organization) => organization.id === state.selectedEntitlementOrganizationId
        ) ?? null
      );
    },
    hasEntitlementScope(state): boolean {
      return state.entitlementOrganizations.length > 0;
    },
    hasUsableEntitlementScope(): boolean {
      return this.activeEntitlementOrganization?.status === 'active';
    },
    entitlementScopeKey(state): string {
      return `${state.currentAccount?.id ?? 'no-account'}:${
        state.selectedEntitlementOrganizationId ?? 'no-entitlement-organization'
      }`;
    },
    canManageSelectedEntitlementOrganizationMembership(state): boolean {
      if (!state.currentAccount || !state.selectedEntitlementOrganizationId) {
        return false;
      }

      return canManageOrganizationMembership(
        state.currentAccount,
        state.selectedEntitlementOrganizationId
      );
    },
  },
  actions: {
    applySession(session: DemoIdentitySession, requestedAccountId: string | null) {
      const entitlementOrganizations = getManageableEntitlementOrganizations(
        session.currentAccount
      );
      const selectedOrganizationId = selectEntitlementOrganizationId(
        entitlementOrganizations,
        this.selectedEntitlementOrganizationId ?? readStoredEntitlementOrganizationId()
      );

      this.accounts = session.accounts;
      this.currentAccount = session.currentAccount;
      this.selectedAccountId = session.currentAccount.id;
      this.accessToken = session.accessToken;
      this.tokenType = session.tokenType;
      this.expiresAt = session.expiresAt;
      this.entitlementOrganizations = entitlementOrganizations;
      this.selectedEntitlementOrganizationId = selectedOrganizationId;
      this.errorMessage = null;
      this.noticeMessage =
        requestedAccountId && requestedAccountId !== session.currentAccount.id
          ? translate('identity.storedAccountUnavailable')
          : null;

      persistAccountId(session.currentAccount.id);
      persistEntitlementOrganizationId(selectedOrganizationId);
      writeStoredIdentityToken({
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
      });
    },
    async initialize(): Promise<DemoIdentitySession | undefined> {
      if (this.loading) {
        return undefined;
      }

      const requestedAccountId = this.selectedAccountId ?? readStoredAccountId();
      this.loading = true;
      this.errorMessage = null;

      try {
        const session = await fetchIdentitySession({ selectedAccountId: requestedAccountId });
        this.applySession(session, requestedAccountId);
        this.initialized = true;

        return session;
      } catch (error) {
        clearStoredIdentityToken();
        this.errorMessage = getErrorMessage(error);
        this.initialized = true;

        return undefined;
      } finally {
        this.loading = false;
      }
    },
    async switchAccount(accountId: string): Promise<DemoIdentitySession | undefined> {
      if (this.switching) {
        return undefined;
      }

      this.switching = true;
      this.errorMessage = null;
      this.noticeMessage = null;
      this.selectedAccountId = accountId;
      persistAccountId(accountId);

      try {
        const session = await fetchIdentitySession({ selectedAccountId: accountId });
        this.applySession(session, accountId);
        this.initialized = true;

        return session;
      } catch (error) {
        clearStoredIdentityToken();
        this.errorMessage = getErrorMessage(error);

        return undefined;
      } finally {
        this.switching = false;
      }
    },
    selectEntitlementOrganization(organizationId: string | null): void {
      const selectedOrganization = this.entitlementOrganizations.find(
        (organization) => organization.id === organizationId
      );

      this.selectedEntitlementOrganizationId = selectedOrganization?.id ?? null;
      persistEntitlementOrganizationId(this.selectedEntitlementOrganizationId);
    },
    getCurrentAccessToken(): string | null {
      if (this.accessToken && !isTokenExpired(this.expiresAt)) {
        return this.accessToken;
      }

      return readStoredIdentityAccessToken();
    },
    resetSession(): void {
      clearStoredAccountId();
      clearStoredEntitlementOrganizationId();
      clearStoredIdentityToken();
      this.accounts = [];
      this.currentAccount = null;
      this.selectedAccountId = null;
      this.accessToken = null;
      this.tokenType = null;
      this.expiresAt = null;
      this.entitlementOrganizations = [];
      this.selectedEntitlementOrganizationId = null;
      this.initialized = false;
      this.loading = false;
      this.switching = false;
      this.errorMessage = null;
      this.noticeMessage = null;
    },
  },
});

export async function getCurrentIdentityAccessToken(): Promise<string | null> {
  try {
    return useIdentitySessionStore().getCurrentAccessToken();
  } catch {
    return readStoredIdentityAccessToken();
  }
}
