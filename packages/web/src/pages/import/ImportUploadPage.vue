<script setup lang="ts">
import {
  Combobox,
  FileDropzone,
  type ComboboxOption,
  type FileDropzoneRejection,
} from '@hugo-ui/shadcn-vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { parseImportCsv } from '@/features/importer/importer-validation';
import { useIdentitySessionStore } from '@/shared/stores/identity-session-store';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const { t } = useI18n();
const store = useImportWorkflowStore();
const identityStore = useIdentitySessionStore();
const selectedFiles = ref<File[]>([]);
const uploadError = ref<string | null>(null);
const productMenuOpen = ref(false);
const productQuery = ref('');
const maxCsvSize = 5 * 1024 * 1024;

const selectedProduct = computed(() => store.selectedProduct);
const selectedProductKey = computed(() => selectedProduct.value?.key ?? null);
const hasProducts = computed(() => store.products.length > 0);
const productOptions = computed<ComboboxOption[]>(() =>
  store.products.map((product) => ({
    value: product.key,
    label: product.name,
    description: `${product.entitlementCode} · ${t('upload.productSeatsDescription', {
      allocated: product.allocatedQuantity,
      purchased: product.purchasedQuantity,
    })}`,
  }))
);

function handleProductChange(value: string | number | null) {
  if (value != null) {
    store.selectProduct(String(value));
    productQuery.value = '';
    selectedFiles.value = [];
    uploadError.value = null;
  }
}

function handleProductMenuOpenChange(open: boolean) {
  productMenuOpen.value = open;
  productQuery.value = open ? '' : (selectedProduct.value?.name ?? '');
}

function handleProductQueryChange(query: string) {
  productQuery.value = query;
}

function retryLoadProducts() {
  if (identityStore.selectedEntitlementOrganizationId) {
    void store.loadAvailableProducts(identityStore.selectedEntitlementOrganizationId);
  }
}

async function importFile(file: File | null | undefined) {
  uploadError.value = null;

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    uploadError.value = t('upload.errors.chooseCsv');
    return;
  }

  const content = await file.text();
  const rows = parseImportCsv(content);

  if (rows.length === 0) {
    uploadError.value = t('upload.errors.emptyCsv');
    return;
  }

  store.setImportedCsv({ name: file.name, content }, rows);
  void router.push('/import/review');
}

function handleFileSelected(files: File[]) {
  void importFile(files[0]);
}

function handleFileRejected(rejections: FileDropzoneRejection[]) {
  uploadError.value = rejections[0]?.message ?? t('upload.errors.fileSelectionFailed');
}

watch(
  selectedProduct,
  (product) => {
    if (!productMenuOpen.value) {
      productQuery.value = product?.name ?? '';
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="import-screen import-upload-screen">
    <div class="import-workspace">
      <aside class="target-panel" aria-labelledby="target-entitlement-title">
        <div class="target-panel__header">
          <h1 id="target-entitlement-title">{{ t('upload.targetEntitlement') }}</h1>
        </div>

        <div class="target-panel__body">
          <Combobox
            class="target-combobox"
            :model-value="selectedProductKey"
            :open="productMenuOpen"
            :options="productOptions"
            :query="productQuery"
            :label="t('common.labels.product')"
            :placeholder="t('upload.searchProductOrEntitlement')"
            @update:model-value="handleProductChange"
            @update:open="handleProductMenuOpenChange"
            @update:query="handleProductQueryChange"
          />

          <p v-if="store.productsLoading" class="target-state">
            {{ t('upload.loadingProducts') }}
          </p>
          <div v-else-if="store.productsError" class="target-state target-state--error">
            <span>{{ store.productsError }}</span>
            <button class="target-state__action" type="button" @click="retryLoadProducts">
              {{ t('common.actions.retry') }}
            </button>
          </div>
          <p v-else-if="!hasProducts" class="target-state">
            {{ t('upload.noProducts') }}
          </p>

          <dl class="target-details" v-if="selectedProduct">
            <div>
              <dt>{{ t('common.labels.entitlement') }}</dt>
              <dd>{{ selectedProduct.entitlementCode }}</dd>
            </div>
            <div>
              <dt>{{ t('upload.seats') }}</dt>
              <dd>
                {{ selectedProduct.allocatedQuantity }} / {{ selectedProduct.purchasedQuantity }}
              </dd>
            </div>
          </dl>
        </div>
      </aside>

      <div class="upload-panel">
        <FileDropzone
          v-model="selectedFiles"
          accept=".csv,text/csv"
          :browse-label="t('upload.chooseCsv')"
          :description="t('upload.dropCsvDescription')"
          :error="uploadError ?? undefined"
          :max-size="maxCsvSize"
          :title="t('upload.dropCsvTitle')"
          @reject="handleFileRejected"
          @select="handleFileSelected"
        />
      </div>
    </div>
  </section>
</template>
