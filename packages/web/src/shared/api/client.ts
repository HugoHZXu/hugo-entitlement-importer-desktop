export const DEFAULT_BACKEND_URL = 'http://localhost:4317';

export interface ApiClientOptions {
  baseUrl?: string;
}

export function createApiUrl(path: string, options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? DEFAULT_BACKEND_URL;
  return new URL(path, baseUrl).toString();
}

