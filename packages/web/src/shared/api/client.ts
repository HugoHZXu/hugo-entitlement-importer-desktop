import { getCurrentIdentityAccessToken } from '@/shared/stores/identity-session-store';
import { getEntitlementGraphqlUrl } from '@/shared/config/entitlement-service';
import { translate } from '@/shared/i18n';
import type {
  BulkImportHistoryDetail,
  BulkImportJob,
  BulkImportJobDetail,
  BulkImportJobRow,
  BulkImportJobStatus,
  BulkImportResultArtifact,
  CommitBulkImportJobInput,
  CreateBulkImportJobInput,
  PageResult,
  Product,
  ProductEntitlement,
} from '@/shared/types';

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:4317';

export interface ApiClientOptions {
  baseUrl?: string;
}

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
};

type GraphqlError = {
  message?: string;
};

type GraphqlResponse<TData> = {
  data?: TData | null;
  errors?: GraphqlError[];
};

type BulkImportRowsResponse =
  | BulkImportJobRow[]
  | Partial<PageResult<BulkImportJobRow>>;

type EntitlementRequestScope = {
  organizationId?: string | null;
};

export interface ListBulkImportJobsOptions {
  organizationId: string;
  pageNumber?: number;
  pageSize?: number;
  productId?: string;
  status?: BulkImportJobStatus;
}

export interface ListBulkImportJobRowsOptions {
  jobId: string;
  pageNumber?: number;
  pageSize?: number;
  status?: BulkImportJobRow['status'];
}

const PRODUCT_FIELDS = `
  id
  icon
  name
  provider
  description
  status
  supportedPlatforms
  usageDimensions {
    code
    name
    description
    unit
  }
  entitlementInfo {
    entitlementCode
    grantType
    allocationModel
    subscriberId
    subscriberAccountId
    renewalDate
  }
`;

const ENTITLEMENT_FIELDS = `
  id
  productId
  entitlementCode
  usageDimensionCode
  purchasedQuantity
  allocatedQuantity
  status
  startDate
  endDate
  source
`;

function getBackendUrl(): string {
  return (
    import.meta.env.VITE_ENTITLEMENT_REST_URL ??
    import.meta.env.VITE_BACKEND_URL ??
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, '');
}

export function createApiUrl(path: string, options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? getBackendUrl();
  return new URL(path, baseUrl).toString();
}

function normalizeMessage(message: unknown): string | undefined {
  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    const items = message.filter((item): item is string => typeof item === 'string');

    return items.length > 0 ? items.join(', ') : undefined;
  }

  return undefined;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const errorPayload = payload as ApiErrorPayload;
    const message = normalizeMessage(errorPayload.message);

    if (message) {
      return message;
    }

    const error = normalizeMessage(errorPayload.error);

    if (error) {
      return error;
    }
  }

  return fallback;
}

async function readResponse(response: Response): Promise<unknown> {
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

async function createHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
  const accessToken = await getCurrentIdentityAccessToken();
  const requestHeaders: HeadersInit = {
    Accept: 'application/json',
    ...headers,
  };

  return accessToken
    ? {
        ...requestHeaders,
        Authorization: `Bearer ${accessToken}`,
      }
    : requestHeaders;
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(createApiUrl(path), {
    ...init,
    headers: await createHeaders({
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    }),
  });
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, translate('errors.requestFailed', { status: response.status }))
    );
  }

  return payload as T;
}

async function requestGraphql<TData, TVariables extends Record<string, unknown>>(
  query: string,
  variables: TVariables
): Promise<TData> {
  const response = await fetch(getEntitlementGraphqlUrl(), {
    body: JSON.stringify({
      query,
      variables,
    }),
    headers: await createHeaders({
      'Content-Type': 'application/json',
    }),
    method: 'POST',
  });
  const payload = (await readResponse(response)) as GraphqlResponse<TData> | unknown;

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, translate('errors.graphQlRequestFailed', { status: response.status }))
    );
  }

  if (payload && typeof payload === 'object') {
    const graphqlPayload = payload as GraphqlResponse<TData>;

    if (graphqlPayload.errors?.length) {
      throw new Error(
        graphqlPayload.errors
          .map((error) => error.message)
          .filter((message): message is string => Boolean(message))
          .join('; ') || translate('errors.graphQlRequestFailed', { status: response.status })
      );
    }

    if (graphqlPayload.data) {
      return graphqlPayload.data;
    }
  }

  throw new Error(translate('errors.graphQlResponseMissingData'));
}

async function requestText(path: string, init: RequestInit = {}): Promise<string> {
  const response = await fetch(createApiUrl(path), {
    ...init,
    headers: await createHeaders(init.headers),
  });
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, translate('errors.requestFailed', { status: response.status }))
    );
  }

  return payload;
}

async function requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await fetch(createApiUrl(path), {
    ...init,
    headers: await createHeaders(init.headers),
  });

  if (!response.ok) {
    const payload = await readResponse(response);

    throw new Error(
      getErrorMessage(payload, translate('errors.requestFailed', { status: response.status }))
    );
  }

  return response.blob();
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function createQueryString(params: Record<string, number | string | null | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}

function normalizeBulkImportRowsResponse(response: BulkImportRowsResponse): BulkImportJobRow[] {
  return Array.isArray(response) ? response : (response.items ?? []);
}

export async function listProducts(scope: EntitlementRequestScope = {}): Promise<Product[]> {
  const data = await requestGraphql<{ products: Product[] }, { organizationId: string | null }>(
    `
      query EntitlementProducts($organizationId: ID) {
        products(organizationId: $organizationId) {
          ${PRODUCT_FIELDS}
        }
      }
    `,
    {
      organizationId: scope.organizationId ?? null,
    }
  );

  return data.products;
}

export async function listEntitlements({
  organizationId,
  productId,
}: {
  organizationId: string;
  productId: string;
}): Promise<ProductEntitlement[]> {
  const data = await requestGraphql<
    { entitlements: ProductEntitlement[] },
    { organizationId: string; productId: string }
  >(
    `
      query ImportEntitlements($organizationId: ID!, $productId: ID!) {
        entitlements(productId: $productId, organizationId: $organizationId) {
          ${ENTITLEMENT_FIELDS}
        }
      }
    `,
    {
      organizationId,
      productId,
    }
  );

  return data.entitlements;
}

export function createBulkImportJob(input: CreateBulkImportJobInput): Promise<BulkImportJobDetail> {
  const { organizationId, ...body } = input;

  return requestJson<BulkImportJobDetail>(
    `/organizations/${encodePathSegment(organizationId)}/bulk-import-jobs`,
    {
      body: JSON.stringify(body),
      method: 'POST',
    }
  );
}

export function listBulkImportJobs({
  organizationId,
  pageNumber,
  pageSize,
  productId,
  status,
}: ListBulkImportJobsOptions): Promise<PageResult<BulkImportJob>> {
  const queryString = createQueryString({
    pageNumber,
    pageSize,
    productId,
    status,
  });

  return requestJson<PageResult<BulkImportJob>>(
    `/organizations/${encodePathSegment(organizationId)}/bulk-import-jobs${queryString}`,
    {
      cache: 'no-store',
    }
  );
}

export function getBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}`, {
    cache: 'no-store',
  });
}

export function getBulkImportHistoryDetail(jobId: string): Promise<BulkImportHistoryDetail> {
  return requestJson<BulkImportHistoryDetail>(
    `/bulk-import-jobs/${encodePathSegment(jobId)}/history-detail`,
    {
      cache: 'no-store',
    }
  );
}

export async function listBulkImportJobRows(
  input: string | ListBulkImportJobRowsOptions
): Promise<BulkImportJobRow[]> {
  const options: ListBulkImportJobRowsOptions =
    typeof input === 'string' ? { jobId: input } : input;
  const queryString = createQueryString({
    pageNumber: options.pageNumber,
    pageSize: options.pageSize,
    status: options.status,
  });
  const response = await requestJson<BulkImportRowsResponse>(
    `/bulk-import-jobs/${encodePathSegment(options.jobId)}/rows${queryString}`,
    {
      cache: 'no-store',
    }
  );

  return normalizeBulkImportRowsResponse(response);
}

export function validateBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}/validate`, {
    method: 'POST',
  });
}

export function commitBulkImportJob(
  jobId: string,
  input: CommitBulkImportJobInput = {}
): Promise<BulkImportJobDetail> {
  const hasBody = Object.keys(input).length > 0;

  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}/commit`, {
    ...(hasBody ? { body: JSON.stringify(input) } : {}),
    method: 'POST',
  });
}

export function cancelBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}/cancel`, {
    method: 'POST',
  });
}

export function downloadBulkImportArtifact({
  artifact,
  jobId,
}: {
  artifact: BulkImportResultArtifact;
  jobId: string;
}): Promise<string> {
  if (artifact === 'report') {
    return requestText(`/bulk-import-jobs/${encodePathSegment(jobId)}/report`, {
      headers: {
        Accept: 'text/markdown',
      },
    });
  }

  return requestText(`/bulk-import-jobs/${encodePathSegment(jobId)}/result/${artifact}`, {
    headers: {
      Accept: 'text/csv',
    },
  });
}

export function downloadBulkImportArtifactsZip(jobId: string): Promise<Blob> {
  return requestBlob(`/bulk-import-jobs/${encodePathSegment(jobId)}/artifacts.zip`, {
    headers: {
      Accept: 'application/zip',
    },
  });
}

export function downloadBulkImportArtifactsZipUrl(artifactZipUrl: string): Promise<Blob> {
  return requestBlob(artifactZipUrl, {
    headers: {
      Accept: 'application/zip',
    },
  });
}
