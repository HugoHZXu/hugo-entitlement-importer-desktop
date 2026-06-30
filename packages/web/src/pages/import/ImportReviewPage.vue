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
import { useRouter } from 'vue-router';

import { buildReviewChartsPayload } from '@/features/importer/importer-chart-data';
import type { ImportCsvRow, ImportRowStatus } from '@/features/importer/importer-types';
import { useIdentitySessionStore } from '@/shared/stores/identity-session-store';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();
const identityStore = useIdentitySessionStore();
const reviewChartsWindowOpen = ref(false);
const validationResultModalOpen = ref(false);
let cleanupReviewChartsWindowClosed: (() => void) | null = null;

const statusTone: Record<ImportRowStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  blocked: 'danger',
  deleted: 'neutral',
  failed: 'danger',
  ready: 'success',
  skipped: 'warning',
  success: 'success',
  warning: 'warning',
};

const actionOptions: SelectOption[] = [
  { value: 'assign', label: 'assign' },
  { value: 'revoke', label: 'revoke' },
];

const statusFilterOptions: SelectOption[] = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'warning', label: 'Warning' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'deleted', label: 'Deleted' },
];

const filteredRows = computed(() => {
  if (store.rowStatusFilter === 'all') {
    return store.rows;
  }

  return store.rows.filter((row) => row.status === store.rowStatusFilter);
});
const reviewChartsPayload = computed(() =>
  buildReviewChartsPayload({
    rows: store.rows,
    fileName: store.importedFile?.name,
    entitlement: store.selectedEntitlement,
  })
);
const actionButtonLabel = computed(() => {
  if (store.backendBusy) {
    if (store.creatingJob) {
      return 'Creating job';
    }

    if (store.validatingJob) {
      return 'Validating rows';
    }

    if (store.committingJob) {
      return 'Starting import';
    }
  }

  return store.validationComplete ? 'Start import' : 'Validate with backend';
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

  return `${store.currentJob.status} · ${store.currentJob.readyRows} ready · ${store.currentJob.blockedRows} blocked · ${store.currentJob.skippedRows} skipped`;
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
    return 'Import request failed';
  }

  if (backendValidationFailed.value) {
    return 'Backend validation failed';
  }

  return 'Backend validation complete';
});
const validationResultSubtitle = computed(() => {
  if (store.apiError) {
    return 'The backend could not validate this import.';
  }

  if (backendValidationFailed.value) {
    return 'The backend returned a terminal status before the import could continue.';
  }

  if (store.canCommit) {
    return 'Rows are ready to start import.';
  }

  return 'Review and fix blocked rows before starting import.';
});
const validationResultMessage = computed(
  () => store.apiError ?? jobSummary.value ?? 'Validation finished.'
);
const validationResultStats = computed(() => {
  const job = store.currentJob;

  if (!job) {
    return [];
  }

  return [
    { label: 'Ready', value: job.readyRows },
    { label: 'Blocked', value: job.blockedRows },
    { label: 'Skipped', value: job.skippedRows },
  ];
});
const validationResultPrimaryLabel = computed(() => {
  if (store.apiError || backendValidationFailed.value) {
    return 'Close';
  }

  return store.canCommit ? 'Start import' : 'Review rows';
});

function hasIssue(row: ImportCsvRow, issuePrefix: string) {
  return row.issues.some((issue) => issue.code.includes(issuePrefix));
}

function updateSeatQuantity(rowId: string, value: string) {
  const trimmedValue = value.trim();
  store.updateRow(rowId, {
    seatQuantity: trimmedValue === '' ? null : Number(trimmedValue),
  });
}

function updateStatusFilter(value: string | number | null) {
  store.rowStatusFilter = String(value ?? 'all');
}

async function startProcess() {
  if (!identityStore.selectedEntitlementOrganizationId) {
    store.apiError = 'Select an active entitlement organization before importing.';
    validationResultModalOpen.value = true;
    return;
  }

  if (!store.validationComplete) {
    await store.createAndValidateCurrentImport(identityStore.selectedEntitlementOrganizationId);
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
    header: 'Status',
    width: 112,
    render: (row) =>
      h(StatusBadge, {
        label: row.status,
        showDot: true,
        size: 'sm',
        status: row.status,
        tone: statusTone[row.status],
      }),
  },
  {
    id: 'email',
    header: 'Email',
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
    header: 'Name',
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
    header: 'Department',
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
    header: 'Action',
    width: 132,
    render: (row) =>
      h(Select, {
        class: '!w-full',
        disabled: row.deleted,
        modelValue: row.action,
        options: actionOptions,
        placeholder: 'Action',
        size: 'sm',
        status: hasIssue(row, 'action') ? 'error' : 'default',
        'onUpdate:modelValue': (value: string | number | null) =>
          store.updateRow(row.id, { action: String(value ?? '') }),
      }),
  },
  {
    id: 'seatQuantity',
    header: 'Seats',
    width: 132,
    align: 'right',
    render: (row) =>
      h(Input, {
        modelValue: row.seatQuantity ?? '',
        type: 'number',
        size: 'sm',
        status: hasIssue(row, 'seat') ? 'error' : 'default',
        disabled: row.deleted,
        'onUpdate:modelValue': (value: string) => updateSeatQuantity(row.id, value),
      }),
  },
  {
    id: 'issues',
    header: 'Issues',
    width: 200,
    minWidth: 200,
    maxWidth: 200,
    resizable: false,
    render: (row) =>
      row.issues.length === 0
        ? h(StatusBadge, {
            label: 'None',
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
                label: issue.code,
                showDot: true,
                size: 'sm',
                status: issue.severity,
                title: issue.message,
                tone: issue.severity === 'blocked' ? 'danger' : 'warning',
              })
            )
          ),
  },
  {
    id: 'operation',
    header: 'Operation',
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
        () => (row.deleted ? 'Undo' : 'Delete')
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
            description="Choose a CSV file before reviewing imported rows."
            title="No CSV loaded"
            variant="page"
          >
            <template #action>
              <Button type="button" @click="router.push('/import/upload')">Go to upload</Button>
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
          aria-label="Back to upload"
          title="Back to upload"
          @click="router.push('/import/upload')"
        >
          <ArrowLeft :size="24" aria-hidden="true" />
        </button>
        <div class="review-header__copy">
          <h1>Review and edit rows</h1>
          <p>
            Duplicate detection uses lowercased email only. Conflicting assign/revoke rows are
            blocked until fixed or deleted.
          </p>
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
            View import impact
          </button>
        </div>
        <Select
          class="status-filter-select"
          label="Rows"
          :model-value="store.rowStatusFilter"
          :options="statusFilterOptions"
          size="sm"
          @update:model-value="updateStatusFilter"
        />
      </div>

      <div class="review-table-panel">
        <DataGrid
          ariaLabel="Imported entitlement rows"
          :columns="dataGridColumns"
          :rows="filteredRows"
          :get-row-id="getRowId"
          fill
          :row-height="68"
          empty="No rows match the current filter."
        />
      </div>

      <Modal
        v-model:open="validationResultModalOpen"
        aria-label="Backend validation result"
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
              Keep reviewing
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
