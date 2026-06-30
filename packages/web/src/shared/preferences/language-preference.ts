export type AppLanguage = 'zh-CN' | 'en-US';

export const APP_LANGUAGE_STORAGE_KEY = 'hugo-entitlement-importer:language';

const fallbackLanguage: AppLanguage = 'zh-CN';
const supportedLanguages = ['zh-CN', 'en-US'] as const;

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return supportedLanguages.includes(value as AppLanguage);
}

export function readStoredAppLanguage(): AppLanguage {
  try {
    const value =
      typeof window === 'undefined' ? null : window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY);

    return isAppLanguage(value) ? value : fallbackLanguage;
  } catch {
    return fallbackLanguage;
  }
}

export function writeStoredAppLanguage(language: AppLanguage): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    }
  } catch {
    // The selected language still applies in memory when local storage is unavailable.
  }
}

export function applyAppLanguage(language: AppLanguage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}
