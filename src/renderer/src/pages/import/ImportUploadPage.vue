<script setup lang="ts">
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  FileDropzone,
  MetricTile,
  type ComboboxOption,
  type FileDropzoneRejection,
} from '@hugo-ui/shadcn-vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { parseImportCsv } from '@/features/importer/importer-validation';
import { useImportWorkflowStore } from '@/shared/stores/import-workflow-store';

const router = useRouter();
const store = useImportWorkflowStore();
const selectedFiles = ref<File[]>([]);
const uploadError = ref<string | null>(null);
const maxCsvSize = 5 * 1024 * 1024;

const selectedProduct = computed(() => store.selectedProduct);
const productOptions = computed<ComboboxOption[]>(() =>
  store.products.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${product.entitlementCode} · ${product.allocatedQuantity}/${product.purchasedQuantity} seats`,
  }))
);

function handleProductChange(value: string | number | null) {
  if (value != null) {
    store.selectProduct(String(value));
  }
}

async function importFile(file: File | null | undefined) {
  uploadError.value = null;

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    uploadError.value = 'Please select a CSV file.';
    return;
  }

  const content = await file.text();
  const rows = parseImportCsv(content);

  if (rows.length === 0) {
    uploadError.value = 'CSV file does not contain any data.';
    return;
  }

  store.setImportedCsv({ name: file.name, content }, rows);
  void router.push('/import/review');
}

function handleFileSelected(files: File[]) {
  void importFile(files[0]);
}

function handleFileRejected(rejections: FileDropzoneRejection[]) {
  uploadError.value = rejections[0]?.message ?? 'File could not be selected.';
}

function resetUpload() {
  selectedFiles.value = [];
  uploadError.value = null;
  store.resetImport();
}
</script>

<template>
  <section class="import-screen">
    <div class="import-hero">
      <div class="import-hero__copy">
        <Badge tone="info">Bulk entitlement import</Badge>
        <h1>Import entitlement changes from CSV</h1>
        <p>
          Upload one CSV for the selected product and entitlement pool. The file is parsed locally
          before any backend job is created.
        </p>
      </div>

      <Card class="import-context-card">
        <CardHeader>
          <CardTitle>Target entitlement</CardTitle>
        </CardHeader>
        <CardContent>
          <Combobox
            class="target-combobox"
            :model-value="store.selectedProductId"
            :options="productOptions"
            label="Product"
            placeholder="Search product or entitlement"
            @update:model-value="handleProductChange"
          />

          <dl class="compact-metrics" v-if="selectedProduct">
            <div>
              <dt>Entitlement</dt>
              <dd>{{ selectedProduct.entitlementCode }}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>
                {{ selectedProduct.allocatedQuantity }} / {{ selectedProduct.purchasedQuantity }}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

    <div class="upload-layout">
      <FileDropzone
        v-model="selectedFiles"
        accept=".csv,text/csv"
        browse-label="Choose CSV"
        description="Required header: email, name, department, action, seatQuantity, note"
        :error="uploadError ?? undefined"
        :max-size="maxCsvSize"
        title="Drop CSV here or choose a file"
        @reject="handleFileRejected"
        @select="handleFileSelected"
      />

      <div class="import-actions">
        <MetricTile
          v-if="selectedProduct"
          compact
          class="upload-context-metric"
          label="Selected entitlement"
          :value="selectedProduct.entitlementCode"
          :description="`${selectedProduct.allocatedQuantity} of ${selectedProduct.purchasedQuantity} seats allocated`"
          tone="info"
        />
        <Button variant="outline" tone="neutral" type="button" @click="resetUpload">
          Reset
        </Button>
      </div>
    </div>
  </section>
</template>
