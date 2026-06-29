export const DEMO_ACCOUNT_STORAGE_KEY = 'entitlementImporter.demoAccountUserId';
export const DEMO_ENTITLEMENT_ORGANIZATION_STORAGE_KEY =
  'entitlementImporter.demoEntitlementOrganizationId';
export const IDENTITY_ACCESS_TOKEN_STORAGE_KEY = 'entitlementImporter.identityAccessToken';
export const IDENTITY_ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY =
  'entitlementImporter.identityAccessTokenExpiresAt';

export type DemoOrganizationKind = 'internal' | 'tenant' | 'public' | (string & {});
export type DemoOrganizationStatus = 'active' | 'inactive' | 'archived' | (string & {});

export interface DemoRole {
  id?: string | null;
  key: string;
  name: string;
}

export interface DemoCapabilities {
  orgManagement: boolean;
  userManagement: boolean;
}

export interface DemoOrganizationScope {
  id: string;
  name: string;
  kind: DemoOrganizationKind;
  status: DemoOrganizationStatus;
}

export interface DemoAccountMembership {
  organization: DemoOrganizationScope;
  membershipStatus: string;
  roles: DemoRole[];
}

export interface DemoAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  accountStatus: string;
  persona: string;
  memberships: DemoAccountMembership[];
  capabilities: DemoCapabilities;
  userManagementOrganizations: DemoOrganizationScope[];
  entitlementOrganizations: DemoOrganizationScope[];
}

export interface DemoAccountsResponse {
  defaultAccountId: string;
  accounts: DemoAccount[];
}

export interface DemoTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  expires_at: string;
}

export interface IdentityUserInfo {
  sub: string;
  email: string;
  name: string;
  accountStatus: string;
  roles: string[];
  organizations: Array<{
    id: string;
    name: string;
    kind: string;
    status: string;
    membershipStatus: string;
    roles: string[];
  }>;
  capabilities: DemoCapabilities;
  userManagementOrganizations: DemoOrganizationScope[];
  entitlementOrganizations: DemoOrganizationScope[];
}

export interface DemoIdentitySession {
  accounts: DemoAccount[];
  currentAccount: DemoAccount;
  capabilities: DemoCapabilities;
  entitlementOrganizations: DemoOrganizationScope[];
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}
