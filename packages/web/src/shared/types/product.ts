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
  entitlementCode: string;
  grantType: 'Contract license' | 'Trial license' | 'Scheduled license' | (string & {});
  allocationModel: string;
  subscriberId: string;
  subscriberAccountId: string;
  renewalDate: string;
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

export interface ProductEntitlement {
  id: string;
  productId: string;
  entitlementCode: string;
  usageDimensionCode: string;
  purchasedQuantity: number;
  allocatedQuantity: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  source: string;
}
