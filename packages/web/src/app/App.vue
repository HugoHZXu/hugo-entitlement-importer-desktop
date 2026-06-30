<script setup lang="ts">
import { History, Settings, UploadCloud } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import EntitlementAccessState from '@/features/identity/EntitlementAccessState.vue';
import IdentityHeaderMenu from '@/features/identity/IdentityHeaderMenu.vue';
import { useIdentitySessionStore } from '@/shared/stores/identity-session-store';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const identityStore = useIdentitySessionStore();
const importWorkflowStore = useImportWorkflowStore();
const appInfo = ref<{ appVersion: string; platform: string } | null>(null);

const navItems = computed(() => [
  { path: '/import/upload', label: t('app.nav.import'), icon: UploadCloud, match: '/import' },
  { path: '/history', label: t('app.nav.history'), icon: History, match: '/history' },
  { path: '/settings', label: t('app.nav.settings'), icon: Settings, match: '/settings' },
]);

const activePath = computed(() => route.path);
const isStandaloneRoute = computed(() => route.meta.layout === 'standalone');
const blockingAccessState = computed<
  'error' | 'loading' | 'noAccounts' | 'noEntitlementScope' | 'organizationUnavailable' | null
>(() => {
  if (isStandaloneRoute.value) {
    return null;
  }

  if (identityStore.loading || !identityStore.initialized) {
    return 'loading';
  }

  if (identityStore.errorMessage) {
    return 'error';
  }

  if (identityStore.accounts.length === 0) {
    return 'noAccounts';
  }

  if (!identityStore.hasEntitlementScope) {
    return 'noEntitlementScope';
  }

  if (!identityStore.hasUsableEntitlementScope) {
    return 'organizationUnavailable';
  }

  return null;
});

onMounted(async () => {
  appInfo.value = await window.desktopApi.getAppInfo();

  if (!isStandaloneRoute.value) {
    void initializeIdentitySession();
  }
});

function handleRetryIdentitySession() {
  void initializeIdentitySession();
}

async function loadProductsForCurrentScope() {
  if (
    isStandaloneRoute.value ||
    !identityStore.initialized ||
    !identityStore.hasUsableEntitlementScope ||
    !identityStore.selectedEntitlementOrganizationId
  ) {
    importWorkflowStore.clearAvailableProducts();
    return;
  }

  await importWorkflowStore.loadAvailableProducts(identityStore.selectedEntitlementOrganizationId);
}

async function initializeIdentitySession() {
  await identityStore.initialize();
  await loadProductsForCurrentScope();
}

watch(isStandaloneRoute, (standalone) => {
  if (!standalone && !identityStore.initialized && !identityStore.loading) {
    void initializeIdentitySession();
  }
});

watch(
  () => identityStore.entitlementScopeKey,
  (nextScopeKey, previousScopeKey) => {
    if (
      isStandaloneRoute.value ||
      !identityStore.initialized ||
      !previousScopeKey ||
      nextScopeKey === previousScopeKey ||
      previousScopeKey.startsWith('no-account:')
    ) {
      return;
    }

    importWorkflowStore.resetImport();
    void loadProductsForCurrentScope();

    if (!route.path.startsWith('/import/upload')) {
      void router.push('/import/upload');
    }
  }
);
</script>

<template>
  <RouterView v-if="isStandaloneRoute" />

  <div v-else class="app-shell">
    <aside class="nav-rail" :aria-label="t('app.nav.primary')">
      <div class="rail-brand" :aria-label="t('app.brand')">
        <span>H</span>
      </div>

      <nav class="rail-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          class="rail-nav-item"
          :class="{ active: activePath.startsWith(item.match) }"
          :to="item.path"
        >
          <component :is="item.icon" :size="22" stroke-width="2.1" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="rail-footer" v-if="appInfo">
        <span>v{{ appInfo.appVersion }}</span>
      </div>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <div>
          <p class="eyebrow">{{ t('app.brand') }}</p>
          <p class="status-line">
            <span class="status-dot pending" aria-hidden="true"></span>
            {{ t('app.localBackendPending') }}
          </p>
        </div>
        <div class="topbar-actions">
          <IdentityHeaderMenu />
          <div class="app-meta" v-if="appInfo">
            {{ appInfo.platform }}
          </div>
        </div>
      </header>

      <EntitlementAccessState
        v-if="blockingAccessState"
        :detail="blockingAccessState === 'error' ? identityStore.errorMessage : null"
        :kind="blockingAccessState"
        @retry="handleRetryIdentitySession"
      />
      <RouterView v-else />
    </main>
  </div>
</template>
