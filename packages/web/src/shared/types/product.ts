export type ProductStatus = 'active' | 'scheduled' | 'retired' | (string & {});
export type ProductIconName =
  | 'insight-studio'
  | 'workflow-hub'
  | 'access-monitor'
  | (string & {});

export interface UsageDimension {
  code: string;
  name: string;
  description: string;
  unit: 'seat' | 'device' | 'credit' | (string & {});
}

export interface ProductEntitlementInfo {
  id?: string;
  orgProductEntitlementId?: string;
  entitlementCode: string;
  grantType: 'Contract license' | 'Trial license' | 'Scheduled license' | (string & {});
  allocationModel: string;
  subscriberId: string;
  subscriberAccountId: string;
  renewalDate: string;
  status?: string;
  purchasedQuantity?: number;
  allocatedQuantity?: number;
  availableQuantity?: number;
}

export interface Product {
  id: string;
  icon: ProductIconName;
  name: string;
  provider: string;
  description: string;
  status: ProductStatus;
  supportedPlatforms: string[];
  usageDimensions: UsageDimension[];
  entitlementInfo: ProductEntitlementInfo;
}
