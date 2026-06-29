<script setup lang="ts">
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  StatusBadge,
  Timeline,
  type WorkflowStep,
} from '@hugo-ui/shadcn-vue';
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';
import type { BulkImportJobPhase } from '@/shared/types';

const router = useRouter();
const store = useImportWorkflowStore();
let timer: number | undefined;

const stepDefinitions = [
  {
    id: 'rows_staged',
    title: 'Rows staged',
    description: 'The backend job has stored the normalized import rows.',
  },
  {
    id: 'awaiting_review',
    title: 'Validation reviewed',
    description: 'Row-level validation and seat impact are ready for import.',
  },
  {
    id: 'commit_queued',
    title: 'Commit queued',
    description: 'The backend accepted the commit command for ready rows.',
  },
  {
    id: 'applying_changes',
    title: 'Applying entitlement changes',
    description: 'Assign and revoke actions are being applied.',
  },
  {
    id: 'artifacts_ready',
    title: 'Artifacts ready',
    description: 'Building the summary and downloadable result artifacts.',
  },
] satisfies Array<{ id: BulkImportJobPhase; title: string; description: string }>;

const phaseOrder: string[] = stepDefinitions.map((step) => step.id);
const completed = computed(() => store.commitComplete);
const progressValue = computed(() => store.currentJob?.progressPercent ?? (completed.value ? 100 : 65));
const statusLabel = computed(() => {
  if (store.currentJob?.status === 'completedWithErrors') {
    return 'Completed with errors';
  }

  if (store.currentJob?.status === 'failed') {
    return 'Failed';
  }

  if (completed.value) {
    return 'Completed';
  }

  return store.currentJob?.status ?? 'Processing';
});
const workflowSteps = computed<WorkflowStep[]>(() =>
  stepDefinitions.map((step) => {
    const currentPhase = store.currentJob?.phase ?? 'commit_queued';
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const stepIndex = phaseOrder.indexOf(step.id);

    return {
      ...step,
      status:
        completed.value || stepIndex < currentIndex
          ? 'success'
          : stepIndex === currentIndex
            ? 'active'
            : 'pending',
    };
  })
);

function schedulePoll() {
  window.clearTimeout(timer);

  if (!store.selectedJobId || completed.value) {
    return;
  }

  const delay = Math.min(Math.max(store.currentJob?.nextPollAfterMs ?? 800, 250), 5_000);

  timer = window.setTimeout(async () => {
    await store.refreshCurrentJob();
    schedulePoll();
  }, delay);
}

onMounted(async () => {
  if (!store.selectedJobId) {
    void router.push('/import/review');
    return;
  }

  await store.refreshCurrentJob();
  schedulePoll();
});

onUnmounted(() => {
  window.clearTimeout(timer);
});
</script>

<template>
  <section class="import-screen process-screen">
    <Card class="process-card">
      <CardHeader>
        <Badge tone="info">{{ store.selectedJobId ?? 'No job' }}</Badge>
        <CardTitle>Import in progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="process-status">
          <StatusBadge
            :label="statusLabel"
            show-dot
            :status="completed ? 'success' : 'processing'"
            :tone="store.currentJob?.status === 'failed' ? 'danger' : completed ? 'success' : 'info'"
          />
          <Progress
            label="Overall progress"
            :show-value="true"
            :tone="completed ? 'success' : 'default'"
            :value="progressValue"
          />
        </div>

        <Timeline :steps="workflowSteps" />

        <div v-if="store.apiError" class="workflow-message error">
          <strong>Import request failed</strong>
          <span>{{ store.apiError }}</span>
        </div>

        <div class="process-footer">
          <p class="muted-copy" v-if="!completed">Processing rows. Keep this window open.</p>
          <p class="muted-copy" v-else>Processing complete. Review the generated summary.</p>
          <Button type="button" :disabled="!completed" @click="router.push('/import/result')">
            View result
          </Button>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
