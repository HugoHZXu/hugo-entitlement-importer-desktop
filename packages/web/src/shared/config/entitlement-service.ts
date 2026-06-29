const DEFAULT_ENTITLEMENT_GRAPHQL_URL = 'http://127.0.0.1:4317/graphql';

export function getEntitlementGraphqlUrl(): string {
  return import.meta.env.VITE_ENTITLEMENT_GRAPHQL_URL ?? DEFAULT_ENTITLEMENT_GRAPHQL_URL;
}
