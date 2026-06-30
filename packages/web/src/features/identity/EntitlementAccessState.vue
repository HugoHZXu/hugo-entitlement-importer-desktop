<script setup lang="ts">
import { Button, Card, CardContent, EmptyState } from '@hugo-ui/shadcn-vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  detail?: string | null;
  kind:
    | 'error'
    | 'loading'
    | 'noAccounts'
    | 'noEntitlementScope'
    | 'organizationUnavailable';
}>();

const emit = defineEmits<{
  (event: 'retry'): void;
}>();
const { t } = useI18n();

const canRetry = computed(() => props.kind === 'error' || props.kind === 'noAccounts');
</script>

<template>
  <section class="import-screen access-state-screen">
    <Card>
      <CardContent>
        <EmptyState
          :title="t(`identity.accessState.${kind}.title`)"
          :description="detail ?? t(`identity.accessState.${kind}.description`)"
          variant="page"
        >
          <template #action>
            <Button v-if="canRetry" type="button" @click="emit('retry')">
              {{ t('common.actions.retry') }}
            </Button>
          </template>
        </EmptyState>
      </CardContent>
    </Card>
  </section>
</template>
