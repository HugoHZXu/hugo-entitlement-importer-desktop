<script setup lang="ts">
import { Button, Card, CardContent, EmptyState } from '@hugo-ui/shadcn-vue';

defineProps<{
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

const copy: Record<
  string,
  {
    title: string;
    description: string;
    retry?: boolean;
  }
> = {
  error: {
    title: 'Identity service unavailable',
    description: 'The importer cannot load demo accounts or issue an identity token.',
    retry: true,
  },
  loading: {
    title: 'Loading identity context',
    description: 'Demo accounts and entitlement organization scope are being loaded.',
  },
  noAccounts: {
    title: 'No demo accounts',
    description: 'Identity service did not return any account that can use the importer.',
    retry: true,
  },
  noEntitlementScope: {
    title: 'No entitlement import access',
    description:
      'The selected demo account must be an organization admin or Entitlement Manager for an entitlement organization.',
  },
  organizationUnavailable: {
    title: 'Organization unavailable',
    description: 'The selected entitlement organization is not active for import operations.',
  },
};
</script>

<template>
  <section class="import-screen access-state-screen">
    <Card>
      <CardContent>
        <EmptyState :title="copy[kind].title" :description="detail ?? copy[kind].description" variant="page">
          <template #action>
            <Button v-if="copy[kind].retry" type="button" @click="emit('retry')">Retry</Button>
          </template>
        </EmptyState>
      </CardContent>
    </Card>
  </section>
</template>
