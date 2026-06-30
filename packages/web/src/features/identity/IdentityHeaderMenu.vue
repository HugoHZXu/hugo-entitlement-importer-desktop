<script setup lang="ts">
import { Badge } from '@hugo-ui/shadcn-vue';
import { Check, ChevronsUpDown, RefreshCw, UserRound } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  getManageableEntitlementOrganizations,
  useIdentitySessionStore,
} from '@/shared/stores/identity-session-store';
import type { DemoAccount, DemoOrganizationScope } from '@/shared/types';

const identityStore = useIdentitySessionStore();
const { t, te } = useI18n();
const {
  accounts,
  currentAccount,
  entitlementOrganizations,
  errorMessage,
  loading,
  noticeMessage,
  selectedEntitlementOrganizationId,
  switching,
} = storeToRefs(identityStore);
const rootRef = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const accountPickerOpen = ref(false);

const accountLabel = computed(() => currentAccount.value?.displayName ?? t('identity.accountFallback'));
const accountMeta = computed(() => {
  if (currentAccount.value?.email) {
    return currentAccount.value.email;
  }

  if (loading.value) {
    return t('identity.loadingIdentity');
  }

  return t('identity.noAccountSelected');
});
const activeOrganization = computed(
  () =>
    entitlementOrganizations.value.find(
      (organization) => organization.id === selectedEntitlementOrganizationId.value
    ) ?? null
);
const organizationLabel = computed(() => activeOrganization.value?.name ?? t('identity.noEntitlementScope'));
const triggerDisabled = computed(() => loading.value || switching.value);

function translateKnownValue(prefix: string, value: string): string {
  const key = `${prefix}.${value}`;

  return te(key) ? t(key) : value;
}

function formatOrganizationMeta(organization: DemoOrganizationScope): string {
  return t('identity.organizationMeta', {
    kind: translateKnownValue('identity.organizationKind', organization.kind),
    status: translateKnownValue('common.status', organization.status),
  });
}

function isInactiveAccount(account: DemoAccount): boolean {
  return account.accountStatus.toLowerCase() !== 'active';
}

function isUnavailableOrganization(organization: DemoOrganizationScope): boolean {
  return organization.status !== 'active';
}

function getEntitlementAccessSummary(account: DemoAccount): string {
  const manageableOrganizations = getManageableEntitlementOrganizations(account);

  if (manageableOrganizations.length === 0) {
    return t('identity.noEntitlementImportAccess');
  }

  if (manageableOrganizations.length === 1) {
    return manageableOrganizations[0]?.name ?? t('identity.oneEntitlementOrganization');
  }

  return t('identity.entitlementAccessCount', { count: manageableOrganizations.length });
}

function handleDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) {
    menuOpen.value = false;
  }
}

function openAccountPicker() {
  menuOpen.value = false;
  accountPickerOpen.value = true;
}

async function handleSwitchAccount(accountId: string) {
  if (switching.value || accountId === currentAccount.value?.id) {
    accountPickerOpen.value = false;
    return;
  }

  await identityStore.switchAccount(accountId);
  accountPickerOpen.value = false;
}

function handleSelectOrganization(organization: DemoOrganizationScope) {
  if (
    switching.value ||
    isUnavailableOrganization(organization) ||
    organization.id === selectedEntitlementOrganizationId.value
  ) {
    return;
  }

  identityStore.selectEntitlementOrganization(organization.id);
  menuOpen.value = false;
}

function handleRetry() {
  menuOpen.value = false;
  void identityStore.initialize();
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="identity-header-menu" ref="rootRef">
    <button
      class="identity-trigger"
      type="button"
      :disabled="triggerDisabled"
      :aria-label="t('identity.accountMenuLabel')"
      @click.stop="menuOpen = !menuOpen"
    >
      <span class="identity-trigger__icon" aria-hidden="true">
        <UserRound :size="18" />
      </span>
      <span class="identity-trigger__copy">
        <span class="identity-trigger__name">{{ accountLabel }}</span>
        <span class="identity-trigger__meta">{{ organizationLabel }}</span>
      </span>
      <ChevronsUpDown :size="16" aria-hidden="true" />
    </button>

    <div v-if="menuOpen" class="identity-popover" role="menu">
      <div class="identity-summary">
        <span class="identity-summary__name">{{ accountLabel }}</span>
        <span class="identity-summary__meta">{{ accountMeta }}</span>
        <span v-if="currentAccount?.persona" class="identity-summary__meta">
          {{ currentAccount.persona }}
        </span>
        <span v-if="noticeMessage" class="identity-summary__notice">{{ noticeMessage }}</span>
        <span v-if="errorMessage" class="identity-summary__notice">{{ errorMessage }}</span>
      </div>

      <div class="identity-section">
        <div class="identity-section__header">
          <span>{{ t('identity.entitlementOrganization') }}</span>
          <small>{{ t('identity.scopeDescription') }}</small>
        </div>

        <p v-if="entitlementOrganizations.length === 0" class="identity-empty">
          {{ t('identity.noEntitlementImportAccess') }}
        </p>

        <div v-else class="identity-option-list">
          <button
            v-for="organization in entitlementOrganizations"
            :key="organization.id"
            class="identity-option"
            type="button"
            :disabled="switching || isUnavailableOrganization(organization)"
            :aria-pressed="organization.id === selectedEntitlementOrganizationId"
            @click="handleSelectOrganization(organization)"
          >
            <span>
              <span class="identity-option__name">{{ organization.name }}</span>
              <span class="identity-option__meta">{{ formatOrganizationMeta(organization) }}</span>
            </span>
            <Check
              v-if="organization.id === selectedEntitlementOrganizationId"
              :size="16"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div class="identity-menu-actions">
        <button
          class="identity-action"
          type="button"
          :disabled="loading || accounts.length === 0"
          @click="openAccountPicker"
        >
          <UserRound :size="16" aria-hidden="true" />
          <span>
            <span>{{ t('identity.switchAccount') }}</span>
            <small>{{ t('identity.demoAccountsAvailable', { count: accounts.length }) }}</small>
          </span>
        </button>
        <button v-if="errorMessage" class="identity-action" type="button" @click="handleRetry">
          <RefreshCw :size="16" aria-hidden="true" />
          <span>
            <span>{{ t('identity.retryIdentitySession') }}</span>
            <small>{{ t('identity.reloadAccountsAndToken') }}</small>
          </span>
        </button>
      </div>
    </div>

    <div v-if="accountPickerOpen" class="identity-modal-backdrop" @click.self="accountPickerOpen = false">
      <section
        class="identity-modal"
        aria-modal="true"
        role="dialog"
        :aria-label="t('identity.accountPickerLabel')"
      >
        <header class="identity-modal__header">
          <div>
            <h2>{{ t('identity.switchDemoAccount') }}</h2>
            <p>{{ t('identity.selectIdentityDescription') }}</p>
          </div>
          <button class="identity-modal__close" type="button" @click="accountPickerOpen = false">
            {{ t('common.actions.close') }}
          </button>
        </header>

        <div class="identity-account-list">
          <button
            v-for="account in accounts"
            :key="account.id"
            class="identity-account"
            type="button"
            :disabled="switching"
            :aria-pressed="account.id === currentAccount?.id"
            @click="handleSwitchAccount(account.id)"
          >
            <span class="identity-account__copy">
              <span class="identity-account__name">{{ account.displayName }}</span>
              <span class="identity-account__meta">{{ account.email }}</span>
              <span class="identity-account__status">
                <span>{{ account.persona }}</span>
                <Badge v-if="isInactiveAccount(account)" tone="warning">
                  {{ translateKnownValue('common.status', account.accountStatus) }}
                </Badge>
              </span>
              <span class="identity-account__access">{{ getEntitlementAccessSummary(account) }}</span>
            </span>
            <span v-if="account.id === currentAccount?.id" class="identity-account__current">
              <Check :size="14" aria-hidden="true" />
              {{ t('identity.current') }}
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
