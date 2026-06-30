<script setup lang="ts">
import {
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
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';
import type { BulkImportJobPhase } from '@/shared/types';

const router = useRouter();
const { t, te } = useI18n();
const store = useImportWorkflowStore();
let timer: number | undefined;

const stepDefinitions = computed(
  () =>
    [
      {
        id: 'rows_staged',
        title: t('process.steps.rows_staged.title'),
        description: t('process.steps.rows_staged.description'),
      },
      {
        id: 'awaiting_review',
        title: t('process.steps.awaiting_review.title'),
        description: t('process.steps.awaiting_review.description'),
      },
      {
        id: 'commit_queued',
        title: t('process.steps.commit_queued.title'),
        description: t('process.steps.commit_queued.description'),
      },
      {
        id: 'applying_changes',
        title: t('process.steps.applying_changes.title'),
        description: t('process.steps.applying_changes.description'),
      },
      {
        id: 'artifacts_ready',
        title: t('process.steps.artifacts_ready.title'),
        description: t('process.steps.artifacts_ready.description'),
      },
    ] satisfies Array<{ id: BulkImportJobPhase; title: string; description: string }>
);

const phaseOrder = computed<string[]>(() => stepDefinitions.value.map((step) => step.id));
const completed = computed(() => store.commitComplete);
const progressValue = computed(() =>
  store.currentJob?.progressPercent ?? (completed.value ? 100 : 65)
);
const statusLabel = computed(() => {
  if (store.currentJob?.status === 'completedWithErrors') {
    return t('common.status.completedWithErrors');
  }

  if (store.currentJob?.status === 'failed') {
    return t('common.status.failed');
  }

  if (completed.value) {
    return t('common.status.completed');
  }

  if (store.currentJob?.status) {
    const key = `common.status.${store.currentJob.status}`;

    return te(key) ? t(key) : store.currentJob.status;
  }

  return t('common.status.processing');
});
const workflowSteps = computed<WorkflowStep[]>(() =>
  stepDefinitions.value.map((step) => {
    const currentPhase = store.currentJob?.phase ?? 'commit_queued';
    const currentIndex = phaseOrder.value.indexOf(currentPhase);
    const stepIndex = phaseOrder.value.indexOf(step.id);

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
        <CardTitle>{{ t('process.title') }}</CardTitle>
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
            :label="t('process.overallProgress')"
            :show-value="true"
            :tone="completed ? 'success' : 'default'"
            :value="progressValue"
          />
        </div>

        <Timeline :steps="workflowSteps" />

        <div v-if="store.apiError" class="workflow-message error">
          <strong>{{ t('process.requestFailed') }}</strong>
          <span>{{ store.apiError }}</span>
        </div>

        <div class="process-footer">
          <p class="process-footer__status muted-copy" v-if="!completed">
            {{ t('process.processingRows') }}
          </p>
          <p class="process-footer__status muted-copy" v-else>
            {{ t('process.processingComplete') }}
          </p>
          <div class="process-footer__actions">
            <Button type="button" :disabled="!completed" @click="router.push('/import/result')">
              {{ t('process.viewResult') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
