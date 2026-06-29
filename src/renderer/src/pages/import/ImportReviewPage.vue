<script setup lang="ts">
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataGrid,
  EmptyState,
  Input,
  MetricTile,
  Select,
  StatusBadge,
  type DataGridColumn,
  type SelectOption,
} from '@hugo-ui/shadcn-vue';
import { computed, h } from 'vue';
import { useRouter } from 'vue-router';

import type { ImportCsvRow, ImportRowStatus } from '@/features/importer/importer-types';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();

const statusTone: Record<ImportRowStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ready: 'success',
  warning: 'warning',
  blocked: 'danger',
  deleted: 'neutral',
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
  { value: 'deleted', label: 'Deleted' },
];

const filteredRows = computed(() => {
  if (store.rowStatusFilter === 'all') {
    return store.rows;
  }

  return store.rows.filter((row) => row.status === store.rowStatusFilter);
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

function startProcess() {
  store.startMockProcessing();
  void router.push('/import/process');
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
    id: 'rowNumber',
    header: 'Row',
    width: 84,
    align: 'right',
    render: (row) => row.rowNumber,
  },
  {
    id: 'email',
    header: 'Email',
    minWidth: 240,
    render: (row) =>
      h(Input, {
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
    id: 'note',
    header: 'Note',
    minWidth: 220,
    render: (row) =>
      h(Input, {
        modelValue: row.note,
        size: 'sm',
        disabled: row.deleted,
        'onUpdate:modelValue': (value: string) => store.updateRow(row.id, { note: value }),
      }),
  },
  {
    id: 'issues',
    header: 'Issues',
    minWidth: 280,
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
    align: 'center',
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
        <div>
          <Badge tone="info">{{ store.importedFile?.name }}</Badge>
          <h1>Review and edit rows</h1>
          <p>
            Duplicate detection uses lowercased email only. Conflicting assign/revoke rows are
            blocked until fixed or deleted.
          </p>
        </div>
        <div class="review-actions">
          <Button variant="outline" tone="neutral" type="button" @click="router.push('/import/upload')">
            Replace file
          </Button>
          <Button type="button" :disabled="!store.canSubmit" @click="startProcess">
            Start import
          </Button>
        </div>
      </div>

      <div class="metric-grid">
        <MetricTile compact label="Total" :value="store.summary.totalRows" description="Rows in file" />
        <MetricTile
          compact
          label="Ready"
          :value="store.summary.readyRows"
          description="Can be committed"
          tone="success"
        />
        <MetricTile
          compact
          label="Warnings"
          :value="store.summary.warningRows"
          description="Can continue"
          tone="warning"
        />
        <MetricTile
          compact
          label="Blocked"
          :value="store.summary.blockedRows"
          description="Must fix first"
          tone="danger"
        />
        <MetricTile
          compact
          label="Deleted"
          :value="store.summary.deletedRows"
          description="Skipped by user"
        />
      </div>

      <div class="table-toolbar">
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
    </template>
  </section>
</template>
