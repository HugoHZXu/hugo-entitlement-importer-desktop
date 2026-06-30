import { createI18n } from 'vue-i18n';

import {
  applyAppLanguage,
  isAppLanguage,
  readStoredAppLanguage,
  writeStoredAppLanguage,
  type AppLanguage,
} from '@/shared/preferences/language-preference';

import { messages } from './messages';

export const i18n = createI18n({
  fallbackLocale: 'zh-CN',
  legacy: false,
  locale: readStoredAppLanguage(),
  messages,
});

export function getAppLanguage(): AppLanguage {
  const currentLocale = i18n.global.locale.value;

  return isAppLanguage(currentLocale) ? currentLocale : readStoredAppLanguage();
}

export function setAppLanguage(language: AppLanguage): void {
  i18n.global.locale.value = language;
  writeStoredAppLanguage(language);
  applyAppLanguage(language);
}

export function syncAppLanguage(): void {
  setAppLanguage(getAppLanguage());
}

export function translate(key: string, named?: Record<string, unknown>): string {
  return i18n.global.t(key, named ?? {});
}
