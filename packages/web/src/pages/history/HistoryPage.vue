<script setup lang="ts">
import {
  Button,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
  Select,
  StatusBadge,
  type SelectOption,
  type StatusBadgeTone,
} from '@hugo-ui/shadcn-vue';
import { RefreshCw } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';

import { listBulkImportJobs } from '@/shared/api/client';
import { useIdentitySessionStore } from '@/shared/stores/identity-session-store';
import type { BulkImportJob, BulkImportJobStatus, PageResult } from '@/shared/types';

type HistoryStatusFilter = 'all' | BulkImportJobStatus;

const router = useRouter();
const { t, te, locale } = useI18n();
const identityStore = useIdentitySessionStore();
const jobs = ref<BulkImportJob[]>([]);
const loading = ref(false);
const loadError = ref<string | null>(null);
const pageNumber = ref(0);
const pageSize = 10;
const totalElements = ref(0);
const statusFilter = ref<HistoryStatusFilter>('all');
let loadRequestId = 0;

const statusFilterOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: t('history.allStatuses') },
  { value: 'completed', label: t('common.status.completed') },
  { value: 'completedWithErrors', label: t('common.status.completedWithErrors') },
  { value: 'failed', label: t('common.status.failed') },
  { value: 'cancelled', label: t('common.status.cancelled') },
  { value: 'processing', label: t('common.status.processing') },
  { value: 'validating', label: t('common.status.validating') },
]);

const currentPage = computed({
  get: () => pageNumber.value + 1,
  set: (value: number) => {
    pageNumber.value = Math.max(value - 1, 0);
  },
});
const totalPages = computed(() => Math.max(Math.ceil(totalElements.value / pageSize), 1));
const firstVisibleItem = computed(() =>
  totalElements.value === 0 ? 0 : pageNumber.value * pageSize + 1
);
const lastVisibleItem = computed(() =>
  Math.min((pageNumber.value + 1) * pageSize, totalElements.value)
);
const selectedOrganizationName = computed(
  () => identityStore.activeEntitlementOrganization?.name ?? t('identity.selectedOrganization')
);

watch(
  [
    () => identityStore.selectedEntitlementOrganizationId,
    pageNumber,
    statusFilter,
  ],
  () => {
    void loadHistory();
  },
  { immediate: true }
);

function updateStatusFilter(value: string | number | null) {
  const nextValue = String(value ?? 'all') as HistoryStatusFilter;

  if (statusFilter.value === nextValue) {
    return;
  }

  statusFilter.value = nextValue;
  pageNumber.value = 0;
}

async function loadHistory() {
  const organizationId = identityStore.selectedEntitlementOrganizationId;
  const requestId = ++loadRequestId;

  if (!organizationId) {
    jobs.value = [];
    totalElements.value = 0;
    loadError.value = t('history.selectedOrganizationRequired');
    return;
  }

  loading.value = true;
  loadError.value = null;

  try {
    const result: PageResult<BulkImportJob> = await listBulkImportJobs({
      organizationId,
      pageNumber: pageNumber.value,
      pageSize,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    });

    if (requestId !== loadRequestId) {
      return;
    }

    jobs.value = result.items;
    totalElements.value = result.totalElements;

    if (result.pageNumber !== pageNumber.value) {
      pageNumber.value = result.pageNumber;
    }
  } catch (error) {
    if (requestId !== loadRequestId) {
      return;
    }

    jobs.value = [];
    totalElements.value = 0;
    loadError.value = error instanceof Error ? error.message : t('errors.importHistoryLoadFailed');
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

function refreshHistory() {
  void loadHistory();
}

function openHistoryDetail(jobId: string) {
  void router.push(`/history/${jobId}`);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return t('common.missing.notAvailable');
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function humanizeValue(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatStatusLabel(status: BulkImportJobStatus): string {
  const key = `common.status.${status}`;

  return te(key) ? t(key) : humanizeValue(status);
}

function getJobStatusTone(status: BulkImportJobStatus): StatusBadgeTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'completedWithErrors':
    case 'validated':
    case 'readyToCommit':
      return 'warning';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'processing':
    case 'validating':
      return 'info';
    default:
      return 'neutral';
  }
}

function getCompletedAt(job: BulkImportJob): string {
  return formatDateTime(job.completedAt ?? job.committedAt ?? job.validatedAt ?? job.createdAt);
}
</script>

<template>
  <section class="history-screen">
    <header class="history-header">
      <div class="history-header__copy">
        <p class="eyebrow">{{ t('history.importHistory') }}</p>
        <h1>{{ t('history.importHistory') }}</h1>
        <p>{{ selectedOrganizationName }}</p>
      </div>

      <div class="history-header__actions">
        <Select
          class="history-status-filter"
          :label="t('history.statusLabel')"
          :model-value="statusFilter"
          :options="statusFilterOptions"
          size="sm"
          @update:model-value="updateStatusFilter"
        />
        <Button type="button" variant="outline" :disabled="loading" @click="refreshHistory">
          <RefreshCw :size="16" aria-hidden="true" />
          {{ t('history.refresh') }}
        </Button>
      </div>
    </header>

    <div v-if="loadError" class="workflow-message error">
      <strong>{{ t('history.unavailable') }}</strong>
      <span>{{ loadError }}</span>
    </div>

    <div v-else-if="loading && jobs.length === 0" class="workflow-message">
      <strong>{{ t('history.loadingTitle') }}</strong>
      <span>{{ t('history.loadingDescription') }}</span>
    </div>

    <EmptyState
      v-else-if="jobs.length === 0"
      :description="t('history.empty.description')"
      :title="t('history.empty.title')"
      variant="section"
    >
      <template #action>
        <RouterLink to="/import/upload">
          <Button type="button">{{ t('history.empty.action') }}</Button>
        </RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <div class="history-list" :aria-label="t('history.bulkImportJobsLabel')">
        <button
          v-for="job in jobs"
          :key="job.id"
          class="history-card"
          type="button"
          @click="openHistoryDetail(job.id)"
        >
          <span class="history-card__main">
            <span class="history-card__title" :title="job.fileName">{{ job.fileName }}</span>
            <span class="history-card__meta">
              {{ job.productName || job.productId }} · {{ formatDateTime(job.createdAt) }}
            </span>
          </span>

          <span class="history-card__stats">
            <span>
              <strong>{{ job.totalRows }}</strong>
              <small>{{ t('common.counts.total') }}</small>
            </span>
            <span>
              <strong>{{ job.successRows }}</strong>
              <small>{{ t('common.counts.success') }}</small>
            </span>
            <span>
              <strong>{{ job.skippedRows }}</strong>
              <small>{{ t('common.counts.skipped') }}</small>
            </span>
            <span>
              <strong>{{ job.failedRows + job.blockedRows }}</strong>
              <small>{{ t('common.counts.failed') }}</small>
            </span>
          </span>

          <span class="history-card__side">
            <StatusBadge
              :label="formatStatusLabel(job.status)"
              :status="job.status"
              show-dot
              :tone="getJobStatusTone(job.status)"
            />
            <span>{{ getCompletedAt(job) }}</span>
          </span>
        </button>
      </div>

      <footer class="history-pagination">
        <p>
          {{
            t('history.showingItems', {
              first: firstVisibleItem,
              last: lastVisibleItem,
              total: totalElements,
            })
          }}
        </p>

        <Pagination
          v-if="totalPages > 1"
          v-model:page="currentPage"
          :aria-label="t('history.pagesLabel')"
          :items-per-page="pageSize"
          :sibling-count="1"
          show-edges
          :total="totalElements"
        >
          <PaginationContent v-slot="{ items }">
            <PaginationItem>
              <PaginationFirst :show-label="false" />
            </PaginationItem>
            <PaginationItem>
              <PaginationPrevious :show-label="false" />
            </PaginationItem>

            <template v-for="(item, index) in items" :key="index">
              <PaginationItem
                v-if="item.type === 'page'"
                :is-active="item.value === currentPage"
                :value="item.value"
              />
              <PaginationItem v-else>
                <PaginationEllipsis />
              </PaginationItem>
            </template>

            <PaginationItem>
              <PaginationNext :show-label="false" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLast :show-label="false" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.history-screen {
  display: grid;
  align-content: start;
  gap: 18px;
  height: calc(100vh - 64px);
  min-height: 0;
  overflow: auto;
  padding: 24px;
}

.history-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.history-header__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.history-header h1 {
  color: var(--hugo-ui-shadcn-text-primary);
  font-size: 30px;
  line-height: 1.2;
}

.history-header p:last-child {
  color: var(--hugo-ui-shadcn-text-default);
  font-size: 14px;
}

.history-header__actions {
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 10px;
}

.history-status-filter {
  width: 210px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-card {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(260px, 1.3fr) minmax(340px, 1fr) minmax(190px, auto);
  align-items: center;
  gap: 16px;
  border: 1px solid var(--hugo-ui-shadcn-neutral-grey-500);
  border-radius: 8px;
  background: var(--hugo-ui-shadcn-surface-default);
  color: var(--hugo-ui-shadcn-text-primary);
  cursor: pointer;
  padding: 16px 18px;
  text-align: left;
}

.history-card:hover {
  border-color: var(--hugo-ui-shadcn-brand-primary);
  background: var(--hugo-ui-shadcn-surface-tinted);
}

.history-card:focus-visible {
  outline: 2px solid var(--hugo-ui-shadcn-focus-ring);
  outline-offset: 2px;
}

.history-card__main {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.history-card__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card__meta,
.history-card__side span:last-child {
  overflow: hidden;
  color: var(--hugo-ui-shadcn-text-subtle);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(64px, 1fr));
  gap: 8px;
}

.history-card__stats span {
  display: grid;
  gap: 2px;
}

.history-card__stats strong {
  font-size: 18px;
  line-height: 1.1;
}

.history-card__stats small {
  color: var(--hugo-ui-shadcn-text-subtle);
  font-size: 11px;
  line-height: 1.2;
}

.history-card__side {
  display: grid;
  justify-items: end;
  gap: 8px;
  min-width: 0;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--hugo-ui-shadcn-text-subtle);
  font-size: 13px;
}

.history-pagination p {
  white-space: nowrap;
}

@media (max-width: 980px) {
  .history-header {
    display: grid;
  }

  .history-header__actions {
    justify-content: start;
  }

  .history-card {
    grid-template-columns: 1fr;
  }

  .history-card__side {
    justify-items: start;
  }

  .history-pagination {
    display: grid;
    justify-content: start;
  }
}

@media (max-width: 640px) {
  .history-screen {
    padding: 18px;
  }

  .history-header__actions {
    display: grid;
    justify-content: stretch;
  }

  .history-status-filter {
    width: 100%;
  }

  .history-card__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
