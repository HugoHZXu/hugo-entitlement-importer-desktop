<script setup lang="ts">
import {
  Button,
  Card,
  CardContent,
  DataGrid,
  EmptyState,
  Input,
  Modal,
  ModalContentText,
  Select,
  StatusBadge,
  type DataGridColumn,
  type ModalType,
  type SelectOption,
} from '@hugo-ui/shadcn-vue';
import { ArrowLeft } from '@lucide/vue';
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { buildReviewChartsPayload } from '@/features/importer/importer-chart-data';
import type { ImportCsvRow, ImportRowStatus } from '@/features/importer/importer-types';
import { useIdentitySessionStore } from '@/shared/stores/identity-session-store';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';
import { createImporterChartDataCopy } from '@/shared/i18n/chart-copy';

const router = useRouter();
const { t, te } = useI18n();
const store = useImportWorkflowStore();
const identityStore = useIdentitySessionStore();
const reviewChartsWindowOpen = ref(false);
const validationResultModalOpen = ref(false);
let cleanupReviewChartsWindowClosed: (() => void) | null = null;

const statusTone: Record<ImportRowStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  blocked: 'danger',
  deleted: 'neutral',
  failed: 'danger',
  needsConfirmation: 'warning',
  ready: 'success',
  skipped: 'warning',
  success: 'success',
  warning: 'warning',
};

const actionOptions = computed<SelectOption[]>(() => [
  { value: 'assign', label: t('common.actionsByValue.assign') },
  { value: 'revoke', label: t('common.actionsByValue.revoke') },
]);

const statusFilterOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: t('history.allStatuses') },
  { value: 'ready', label: t('common.status.ready') },
  { value: 'warning', label: t('common.status.warning') },
  { value: 'needsConfirmation', label: t('common.status.needsConfirmation') },
  { value: 'blocked', label: t('common.status.blocked') },
  { value: 'skipped', label: t('common.status.skipped') },
  { value: 'success', label: t('common.status.success') },
  { value: 'failed', label: t('common.status.failed') },
  { value: 'deleted', label: t('common.status.deleted') },
]);

const filteredRows = computed(() => {
  if (store.rowStatusFilter === 'all') {
    return store.rows;
  }

  return store.rows.filter((row) => row.status === store.rowStatusFilter);
});
const reviewChartsPayload = computed(() =>
  buildReviewChartsPayload(
    {
      rows: store.rows,
      fileName: store.importedFile?.name,
      entitlement: store.selectedEntitlement,
      job: store.currentJob,
    },
    createImporterChartDataCopy((key, named) => t(key, named ?? {}))
  )
);
const actionButtonLabel = computed(() => {
  if (store.backendBusy) {
    if (store.creatingJob) {
      return t('review.actionButton.createJob');
    }

    if (store.validatingJob) {
      return t('review.actionButton.validatingRows');
    }

    if (store.committingJob) {
      return t('review.actionButton.startingImport');
    }
  }

  if (store.validationComplete && store.currentJob?.canConfirmImportRows) {
    return t('review.actionButton.confirmAndStart');
  }

  return store.validationComplete
    ? t('review.actionButton.startImport')
    : t('review.actionButton.validateBackend');
});
const actionButtonDisabled = computed(() => {
  if (store.backendBusy || !identityStore.hasUsableEntitlementScope) {
    return true;
  }

  if (store.validationComplete) {
    return !store.canCommit;
  }

  return !store.canCreateBackendJob;
});
const jobSummary = computed(() => {
  if (!store.currentJob) {
    return null;
  }

  return `${formatStatusLabel(store.currentJob.status)} · ${store.currentJob.readyRows} ${t(
    'common.status.ready'
  )} · ${store.currentJob.needsConfirmationRows} ${t(
    'common.counts.needsConfirmation'
  )} · ${store.currentJob.blockedRows} ${t('common.counts.blocked')} · ${
    store.currentJob.skippedRows
  } ${t('common.counts.skipped')}`;
});
const backendValidationFailed = computed(
  () => store.currentJob?.status === 'failed' || store.currentJob?.status === 'cancelled'
);
const validationResultModalType = computed<ModalType>(() => {
  if (store.apiError || backendValidationFailed.value) {
    return 'error';
  }

  return store.canCommit ? 'informational' : 'warning';
});
const validationResultTitle = computed(() => {
  if (store.apiError) {
    return t('review.validation.importRequestFailed');
  }

  if (backendValidationFailed.value) {
    return t('review.validation.backendFailed');
  }

  return t('review.validation.backendComplete');
});
const validationResultSubtitle = computed(() => {
  if (store.apiError) {
    return t('review.validation.importRequestFailedDescription');
  }

  if (backendValidationFailed.value) {
    return t('review.validation.backendFailedDescription');
  }

  if (store.canCommit) {
    if (store.currentJob?.canConfirmImportRows) {
      return t('review.validation.confirmRowsDescription');
    }

    return t('review.validation.readyDescription');
  }

  return t('review.validation.reviewBlockedDescription');
});
const validationResultMessage = computed(
  () => store.apiError ?? jobSummary.value ?? t('review.validation.validationFinished')
);
const validationResultStats = computed(() => {
  const job = store.currentJob;

  if (!job) {
    return [];
  }

  return [
    { label: t('common.status.ready'), value: job.readyRows },
    { label: t('common.status.needsConfirmation'), value: job.needsConfirmationRows },
    { label: t('common.status.blocked'), value: job.blockedRows },
    { label: t('common.status.skipped'), value: job.skippedRows },
  ];
});
const validationResultPrimaryLabel = computed(() => {
  if (store.apiError || backendValidationFailed.value) {
    return t('common.actions.close');
  }

  if (store.currentJob?.canConfirmImportRows) {
    return t('review.actionButton.confirmAndStart');
  }

  return store.canCommit ? t('review.actionButton.startImport') : t('review.validation.reviewRows');
});

function humanizeValue(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function translateKnown(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}

function formatStatusLabel(status: string): string {
  return translateKnown(`common.status.${status}`, humanizeValue(status));
}

function getIssueLabel(code: string): string {
  return translateKnown(`importer.chartData.issues.${code}`, humanizeValue(code));
}

function getIssueMessage(issue: { code: string; message: string }): string {
  return translateKnown(`importer.issueMessages.${issue.code}`, issue.message);
}

function hasIssue(row: ImportCsvRow, issuePrefix: string) {
  return row.issues.some((issue) => issue.code.includes(issuePrefix));
}

function updateStatusFilter(value: string | number | null) {
  store.rowStatusFilter = String(value ?? 'all');
}

async function startProcess() {
  if (!identityStore.selectedEntitlementOrganizationId) {
    store.apiError = t('review.selectedOrgRequired');
    validationResultModalOpen.value = true;
    return;
  }

  if (!store.validationComplete) {
    await store.createAndValidateCurrentImport(identityStore.selectedEntitlementOrganizationId, {
      canManageOrganizationMembership:
        identityStore.canManageSelectedEntitlementOrganizationMembership,
    });
    validationResultModalOpen.value = true;
    return;
  }

  const job = await store.commitCurrentImport();

  if (job) {
    void router.push('/import/process');
  }
}

async function handleValidationResultPrimaryAction() {
  validationResultModalOpen.value = false;

  if (!store.apiError && store.canCommit) {
    await startProcess();
  }
}

async function openChartsWindow() {
  await window.desktopApi.openReviewChartsWindow(reviewChartsPayload.value);
  reviewChartsWindowOpen.value = true;
}

function getRowId(row: unknown) {
  return (row as ImportCsvRow).id;
}

const columns = computed<DataGridColumn<ImportCsvRow>[]>(() => [
  {
    id: 'status',
    header: t('common.labels.status'),
    width: 112,
    render: (row) =>
      h(StatusBadge, {
        label: formatStatusLabel(row.status),
        showDot: true,
        size: 'sm',
        status: row.status,
        tone: statusTone[row.status],
      }),
  },
  {
    id: 'email',
    header: t('common.labels.email'),
    grow: true,
    minWidth: 280,
    render: (row) =>
      h(Input, {
        class: '!w-full',
        modelValue: row.email,
        size: 'sm',
        status: hasIssue(row, 'email') || hasIssue(row, 'conflicting') ? 'error' : 'default',
        disabled: row.deleted,
        'onUpdate:modelValue': (value: string) => store.updateRow(row.id, { email: value }),
      }),
  },
  {
    id: 'name',
    header: t('common.labels.name'),
    minWidth: 180,
    render: (row) =>
      h(Input, {
        modelValue: row.name,
        size: 'sm',
        disabled: row.deleted,
        'onUpdate:modelValue': (value: string) => store.updateRow(row.id, { name: value }),
      }),
  },
  {
    id: 'department',
    header: t('common.labels.department'),
    minWidth: 180,
    render: (row) =>
      h(Input, {
        modelValue: row.department,
        size: 'sm',
        disabled: row.deleted,
        'onUpdate:modelValue': (value: string) => store.updateRow(row.id, { department: value }),
      }),
  },
  {
    id: 'action',
    header: t('common.labels.action'),
    width: 132,
    render: (row) =>
      h(Select, {
        class: '!w-full',
        disabled: row.deleted,
        modelValue: row.action,
        options: actionOptions.value,
        placeholder: t('common.labels.action'),
        size: 'sm',
        status: hasIssue(row, 'action') ? 'error' : 'default',
        'onUpdate:modelValue': (value: string | number | null) =>
          store.updateRow(row.id, { action: String(value ?? '') }),
      }),
  },
  {
    id: 'issues',
    header: t('common.labels.issues'),
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    resizable: false,
    render: (row) =>
      row.issues.length === 0
        ? h(StatusBadge, {
            label: t('common.labels.none'),
            size: 'sm',
            status: 'ready',
            tone: 'neutral',
            variant: 'outline',
          })
        : h(
            'div',
            { class: 'issue-list' },
            row.issues.map((issue) =>
              h(StatusBadge, {
                key: issue.code,
                label: getIssueLabel(issue.code),
                showDot: true,
                size: 'sm',
                status: issue.severity,
                title: getIssueMessage(issue),
                tone: issue.severity === 'blocked' ? 'danger' : 'warning',
              })
            )
          ),
  },
  {
    id: 'operation',
    header: t('common.labels.action'),
    width: 132,
    minWidth: 132,
    maxWidth: 132,
    align: 'center',
    resizable: false,
    render: (row) =>
      h(
        Button,
        {
          size: 'sm',
          variant: 'ghost',
          tone: row.deleted ? 'brand' : 'danger',
          type: 'button',
          onClick: () =>
            row.deleted ? store.undoRowDeleted(row.id) : store.markRowDeleted(row.id),
        },
        () => (row.deleted ? t('common.actions.undo') : t('common.actions.delete'))
      ),
  },
]);

const dataGridColumns = computed(() => columns.value as DataGridColumn<unknown>[]);

watch(
  reviewChartsPayload,
  (payload) => {
    if (reviewChartsWindowOpen.value) {
      window.desktopApi.updateReviewChartsWindow(payload);
    }
  },
  { deep: true }
);

onMounted(() => {
  cleanupReviewChartsWindowClosed = window.desktopApi.onReviewChartsWindowClosed(() => {
    reviewChartsWindowOpen.value = false;
  });
});

onUnmounted(() => {
  cleanupReviewChartsWindowClosed?.();
});
</script>

<template>
  <section class="import-screen review-screen">
    <div v-if="!store.canReview" class="empty-workflow">
      <Card>
        <CardContent>
          <EmptyState
            :description="t('review.emptyState.description')"
            :title="t('review.emptyState.title')"
            variant="page"
          >
            <template #action>
              <Button type="button" @click="router.push('/import/upload')">
                {{ t('review.emptyState.action') }}
              </Button>
            </template>
          </EmptyState>
        </CardContent>
      </Card>
    </div>

    <template v-else>
      <div class="review-header">
        <button
          class="review-back-button"
          type="button"
          :aria-label="t('review.backToUpload')"
          :title="t('review.backToUpload')"
          @click="router.push('/import/upload')"
        >
          <ArrowLeft :size="24" aria-hidden="true" />
        </button>
        <div class="review-header__copy">
          <h1>{{ t('review.headerTitle') }}</h1>
          <p>{{ t('review.headerDescription') }}</p>
        </div>
        <div class="review-actions">
          <Button type="button" :disabled="actionButtonDisabled" @click="startProcess">
            {{ actionButtonLabel }}
          </Button>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-context">
          <span class="review-file-name" :title="store.importedFile?.name">
            {{ store.importedFile?.name }}
          </span>
          <button class="review-impact-link" type="button" @click="openChartsWindow">
            {{ t('review.chartLink') }}
          </button>
        </div>
        <Select
          class="status-filter-select"
          :label="t('review.rowsFilterLabel')"
          :model-value="store.rowStatusFilter"
          :options="statusFilterOptions"
          size="sm"
          @update:model-value="updateStatusFilter"
        />
      </div>

      <div class="review-table-panel">
        <DataGrid
          :ariaLabel="t('review.dataGridLabel')"
          :columns="dataGridColumns"
          :rows="filteredRows"
          :get-row-id="getRowId"
          fill
          :row-height="68"
          :empty="t('review.emptyFilter')"
        />
      </div>

      <Modal
        v-model:open="validationResultModalOpen"
        :aria-label="t('review.backendValidationResult')"
        class="validation-result-modal"
        :class-names="{
          overlay: 'validation-result-modal__overlay',
          content: 'validation-result-modal__content',
        }"
        close-button
        :sub-title="validationResultSubtitle"
        :title="validationResultTitle"
        :type="validationResultModalType"
      >
        <ModalContentText>{{ validationResultMessage }}</ModalContentText>

        <dl v-if="validationResultStats.length > 0" class="validation-result-stats">
          <div v-for="stat in validationResultStats" :key="stat.label">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>

        <template #footer>
          <div class="validation-result-modal__footer">
            <Button
              v-if="!store.apiError && !backendValidationFailed && store.canCommit"
              variant="outline"
              tone="neutral"
              type="button"
              @click="validationResultModalOpen = false"
            >
              {{ t('review.keepReviewing') }}
            </Button>
            <Button type="button" @click="handleValidationResultPrimaryAction">
              {{ validationResultPrimaryLabel }}
            </Button>
          </div>
        </template>
      </Modal>
    </template>
  </section>
</template>
