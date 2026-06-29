const DEFAULT_IDENTITY_SERVICE_URL = 'http://127.0.0.1:4320';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getIdentityServiceUrl(): string {
  return trimTrailingSlash(
    import.meta.env.VITE_IDENTITY_SERVICE_URL ?? DEFAULT_IDENTITY_SERVICE_URL
  );
}
