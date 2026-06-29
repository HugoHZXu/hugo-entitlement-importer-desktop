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
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();
const currentStepIndex = ref(0);
let timer: number | undefined;

const stepDefinitions = [
  {
    id: 'create-job',
    title: 'Creating local import job',
    description: 'Preparing the backend job context for the selected entitlement.',
  },
  {
    id: 'upload-rows',
    title: 'Uploading normalized rows',
    description: 'Sending cleaned CSV rows and deleted row metadata.',
  },
  {
    id: 'validate-impact',
    title: 'Validating entitlement impact',
    description: 'Checking seat capacity and row-level operation safety.',
  },
  {
    id: 'commit-ready',
    title: 'Committing ready rows',
    description: 'Applying assign and revoke actions for rows that passed validation.',
  },
  {
    id: 'prepare-result',
    title: 'Preparing result workspace',
    description: 'Building the summary and downloadable result artifacts.',
  },
];

const completed = computed(() => Boolean(store.processCompletedAt));
const progressValue = computed(() =>
  completed.value ? 100 : Math.round((currentStepIndex.value / stepDefinitions.length) * 100)
);
const workflowSteps = computed<WorkflowStep[]>(() =>
  stepDefinitions.map((step, index) => ({
    ...step,
    status:
      completed.value || index < currentStepIndex.value
        ? 'success'
        : index === currentStepIndex.value
          ? 'active'
          : 'pending',
  }))
);

onMounted(() => {
  if (!store.processStartedAt) {
    store.startMockProcessing();
  }

  timer = window.setInterval(() => {
    if (currentStepIndex.value < stepDefinitions.length - 1) {
      currentStepIndex.value += 1;
      return;
    }

    store.completeMockProcessing();
    window.clearInterval(timer);
  }, 900);
});

onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <section class="import-screen process-screen">
    <Card class="process-card">
      <CardHeader>
        <Badge tone="info">{{ store.selectedJobId }}</Badge>
        <CardTitle>Import in progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="process-status">
          <StatusBadge
            :label="completed ? 'Completed' : 'Processing'"
            show-dot
            :status="completed ? 'success' : 'processing'"
            :tone="completed ? 'success' : 'info'"
          />
          <Progress
            label="Overall progress"
            :show-value="true"
            :tone="completed ? 'success' : 'default'"
            :value="progressValue"
          />
        </div>

        <Timeline :steps="workflowSteps" />

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
