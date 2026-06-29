import { getCurrentIdentityAccessToken } from '@/shared/stores/identity-session-store';
import { getEntitlementGraphqlUrl } from '@/shared/config/entitlement-service';
import type {
  BulkImportJobDetail,
  BulkImportJobRow,
  BulkImportResultArtifact,
  CreateBulkImportJobInput,
  Product,
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

type EntitlementRequestScope = {
  organizationId?: string | null;
};

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
    throw new Error(getErrorMessage(payload, `Request failed with ${response.status}.`));
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
    throw new Error(getErrorMessage(payload, `GraphQL request failed with ${response.status}.`));
  }

  if (payload && typeof payload === 'object') {
    const graphqlPayload = payload as GraphqlResponse<TData>;

    if (graphqlPayload.errors?.length) {
      throw new Error(
        graphqlPayload.errors
          .map((error) => error.message)
          .filter((message): message is string => Boolean(message))
          .join('; ') || 'GraphQL request failed.'
      );
    }

    if (graphqlPayload.data) {
      return graphqlPayload.data;
    }
  }

  throw new Error('GraphQL response did not include data.');
}

async function requestText(path: string, init: RequestInit = {}): Promise<string> {
  const response = await fetch(createApiUrl(path), {
    ...init,
    headers: await createHeaders(init.headers),
  });
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with ${response.status}.`));
  }

  return payload;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
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

export function getBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}`);
}

export function listBulkImportJobRows(jobId: string): Promise<BulkImportJobRow[]> {
  return requestJson<BulkImportJobRow[]>(`/bulk-import-jobs/${encodePathSegment(jobId)}/rows`);
}

export function validateBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}/validate`, {
    method: 'POST',
  });
}

export function commitBulkImportJob(jobId: string): Promise<BulkImportJobDetail> {
  return requestJson<BulkImportJobDetail>(`/bulk-import-jobs/${encodePathSegment(jobId)}/commit`, {
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
