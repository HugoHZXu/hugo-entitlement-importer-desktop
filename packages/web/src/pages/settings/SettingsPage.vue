<script setup lang="ts">
import { Select, type SelectOption, type SelectValue } from '@hugo-ui/shadcn-vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getAppLanguage, setAppLanguage } from '@/shared/i18n';
import { isAppLanguage, type AppLanguage } from '@/shared/preferences/language-preference';

const appVersion = ref<string | null>(null);
const { t } = useI18n();
const selectedLanguage = computed<AppLanguage>(() => getAppLanguage());

const languageOptions: SelectOption[] = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

const versionText = computed(() => appVersion.value ?? t('settings.loadingVersion'));
const versionTitle = computed(() =>
  appVersion.value
    ? `${t('settings.versionTitle')} ${appVersion.value}`
    : t('settings.versionTitle')
);

onMounted(async () => {
  try {
    appVersion.value = (await window.desktopApi?.getAppInfo())?.appVersion ?? '0.0.0';
  } catch {
    appVersion.value = '0.0.0';
  }
});

function handleLanguageChange(value: SelectValue | null) {
  const nextLanguage = String(value ?? '');

  if (!isAppLanguage(nextLanguage)) {
    return;
  }

  setAppLanguage(nextLanguage);
}
</script>

<template>
  <section class="settings-screen" aria-labelledby="settings-title">
    <div class="settings-content">
      <header class="settings-header">
        <h1 id="settings-title">{{ t('settings.pageTitle') }}</h1>
        <p>{{ t('settings.pageDescription') }}</p>
      </header>

      <section class="settings-list" :aria-label="t('settings.pageTitle')">
        <div class="settings-row">
          <div class="settings-copy">
            <h2>{{ versionTitle }}</h2>
            <p>{{ t('settings.versionDescription') }}{{ versionText }}</p>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-copy">
            <h2>{{ t('settings.languageTitle') }}</h2>
            <p>{{ t('settings.languageDescription') }}</p>
          </div>

          <Select
            class="language-select"
            :model-value="selectedLanguage"
            :options="languageOptions"
            :placeholder="t('settings.languageTitle')"
            @update:model-value="handleLanguageChange"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.settings-screen {
  display: grid;
  align-content: start;
  justify-items: center;
  height: calc(100vh - 64px);
  min-height: 0;
  overflow: auto;
  background: var(--hugo-ui-shadcn-surface-default);
  padding: 24px;
}

.settings-content {
  display: grid;
  width: min(100%, 760px);
  gap: 18px;
}

.settings-header {
  display: grid;
  gap: 6px;
}

.settings-header h1 {
  color: var(--hugo-ui-shadcn-text-primary);
  font-size: 24px;
  line-height: 1.2;
}

.settings-header p,
.settings-copy p {
  color: var(--hugo-ui-shadcn-text-subtle);
  font-size: 13px;
  line-height: 1.5;
}

.settings-list {
  display: grid;
  border-top: 1px solid var(--hugo-ui-shadcn-neutral-grey-500);
}

.settings-row {
  display: grid;
  min-height: 78px;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px);
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--hugo-ui-shadcn-neutral-grey-500);
  padding: 16px 0;
}

.settings-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.settings-copy h2 {
  color: var(--hugo-ui-shadcn-text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.language-select {
  justify-self: end;
  width: min(100%, 240px);
}

@media (max-width: 720px) {
  .settings-screen {
    padding: 18px;
  }

  .settings-row {
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .language-select {
    justify-self: stretch;
    width: 100%;
  }
}
</style>
