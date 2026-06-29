import { defineStore } from 'pinia';

import type {
  ImportCsvRow,
  ImportedCsvFile,
  ImportRowStatus,
} from '@/features/importer/importer-types';
import {
  cloneRowWithPatch,
  normalizeImportRows,
  summarizeImportResult,
  summarizeImportRows,
} from '@/features/importer/importer-validation';
import {
  commitBulkImportJob,
  createBulkImportJob,
  getBulkImportJob,
  listProducts,
  listBulkImportJobRows,
  validateBulkImportJob,
} from '@/shared/api/client';
import type { BulkImportJobDetail, BulkImportJobRow, BulkImportJobStatus, Product } from '@/shared/types';

type ProductOption = {
  key: string;
  id: string;
  name: string;
  entitlementId: string;
  entitlementCode: string;
  purchasedQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  entitlementStatus: string;
  productStatus: string;
};

const fallbackProductOptions: ProductOption[] = [
  {
    key: 'prod-insight-studio::ent-insight-studio-2026-001',
    id: 'prod-insight-studio',
    name: 'Insight Studio',
    entitlementId: 'ent-insight-studio-2026-001',
    entitlementCode: 'LIC-INSIGHT-STUDIO-2026',
    purchasedQuantity: 75,
    allocatedQuantity: 28,
    availableQuantity: 47,
    entitlementStatus: 'active',
    productStatus: 'active',
  },
  {
    key: 'prod-workflow-hub::ent-workflow-hub-2026-001',
    id: 'prod-workflow-hub',
    name: 'Workflow Hub',
    entitlementId: 'ent-workflow-hub-2026-001',
    entitlementCode: 'LIC-WORKFLOW-HUB-2026',
    purchasedQuantity: 40,
    allocatedQuantity: 1,
    availableQuantity: 39,
    entitlementStatus: 'active',
    productStatus: 'active',
  },
  {
    key: 'prod-access-monitor::ent-access-monitor-2026-001',
    id: 'prod-access-monitor',
    name: 'Access Monitor',
    entitlementId: 'ent-access-monitor-2026-001',
    entitlementCode: 'LIC-ACCESS-MONITOR-2026',
    purchasedQuantity: 25,
    allocatedQuantity: 1,
    availableQuantity: 24,
    entitlementStatus: 'scheduled',
    productStatus: 'scheduled',
  },
  {
    key: 'prod-insight-studio::ent-brightline-insight-studio-2026-001',
    id: 'prod-insight-studio',
    name: 'Insight Studio',
    entitlementId: 'ent-brightline-insight-studio-2026-001',
    entitlementCode: 'LIC-BRIGHTLINE-INSIGHT-2026',
    purchasedQuantity: 20,
    allocatedQuantity: 1,
    availableQuantity: 19,
    entitlementStatus: 'active',
    productStatus: 'active',
  },
  {
    key: 'prod-workflow-hub::ent-brightline-workflow-hub-2026-001',
    id: 'prod-workflow-hub',
    name: 'Workflow Hub',
    entitlementId: 'ent-brightline-workflow-hub-2026-001',
    entitlementCode: 'LIC-BRIGHTLINE-WORKFLOW-2026',
    purchasedQuantity: 12,
    allocatedQuantity: 1,
    availableQuantity: 11,
    entitlementStatus: 'active',
    productStatus: 'active',
  },
];

function createProductOptionKey(productId: string, entitlementId: string): string {
  return `${productId}::${entitlementId}`;
}

const VALIDATION_TERMINAL_STATUSES = new Set<BulkImportJobStatus>([
  'validated',
  'readyToCommit',
  'cancelled',
  'failed',
]);

const COMMIT_TERMINAL_STATUSES = new Set<BulkImportJobStatus>([
  'completed',
  'completedWithErrors',
  'cancelled',
  'failed',
]);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function getPollDelay(job: BulkImportJobDetail | null): number {
  const delay = job?.nextPollAfterMs ?? 800;

  return Math.min(Math.max(delay, 250), 5_000);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Bulk import request failed.';
}

function findFallbackProductOption(product: Product): ProductOption | undefined {
  return (
    fallbackProductOptions.find(
      (option) =>
        option.id === product.id && option.entitlementCode === product.entitlementInfo.entitlementCode
    ) ?? fallbackProductOptions.find((option) => option.id === product.id)
  );
}

function mapProductToOption(product: Product): ProductOption {
  const fallback = findFallbackProductOption(product);
  const entitlementId =
    product.entitlementInfo.id ??
    product.entitlementInfo.orgProductEntitlementId ??
    fallback?.entitlementId ??
    '';
  const purchasedQuantity =
    product.entitlementInfo.purchasedQuantity ?? fallback?.purchasedQuantity ?? 0;
  const allocatedQuantity =
    product.entitlementInfo.allocatedQuantity ?? fallback?.allocatedQuantity ?? 0;
  const availableQuantity =
    product.entitlementInfo.availableQuantity ??
    fallback?.availableQuantity ??
    Math.max(purchasedQuantity - allocatedQuantity, 0);

  return {
    allocatedQuantity,
    availableQuantity,
    entitlementCode: product.entitlementInfo.entitlementCode,
    entitlementId,
    entitlementStatus: product.entitlementInfo.status ?? fallback?.entitlementStatus ?? 'active',
    id: product.id,
    key: createProductOptionKey(product.id, entitlementId),
    name: product.name,
    productStatus: product.status,
    purchasedQuantity,
  };
}

function normalizeBackendRowStatus(status: BulkImportJobRow['status']): ImportRowStatus {
  switch (status) {
    case 'ready':
      return 'ready';
    case 'warning':
      return 'warning';
    case 'blocked':
      return 'blocked';
    case 'skipped':
      return 'skipped';
    case 'success':
      return 'success';
    case 'failed':
      return 'failed';
    default:
      return 'blocked';
  }
}

function mapBackendRow(row: BulkImportJobRow): ImportCsvRow {
  return {
    action: row.action,
    backendRowId: row.id,
    deleted: false,
    department: row.department,
    email: row.email,
    id: row.id,
    issues: row.issues,
    name: row.name,
    rowNumber: row.rowNumber,
    seatQuantity: row.seatQuantity,
    status: normalizeBackendRowStatus(row.status),
    userKey: row.normalizedEmail || row.email.trim().toLowerCase(),
  };
}

function mapBackendRows(rows: BulkImportJobRow[]): ImportCsvRow[] {
  return rows.map(mapBackendRow);
}

export const useImportWorkflowStore = defineStore('importWorkflow', {
  state: () => ({
    products: [] as ProductOption[],
    selectedProductId: null as string | null,
    selectedEntitlementId: null as string | null,
    productsLoading: false,
    productsError: null as string | null,
    selectedJobId: null as string | null,
    rowStatusFilter: 'all',
    importedFile: null as ImportedCsvFile | null,
    rows: [] as ImportCsvRow[],
    currentJob: null as BulkImportJobDetail | null,
    creatingJob: false,
    validatingJob: false,
    committingJob: false,
    pollingJob: false,
    apiError: null as string | null,
    processStartedAt: null as string | null,
    processCompletedAt: null as string | null,
  }),
  getters: {
    selectedProduct(state) {
      return (
        state.products.find(
          (product) =>
            product.id === state.selectedProductId &&
            product.entitlementId === state.selectedEntitlementId
        ) ?? null
      );
    },
    selectedEntitlement(state) {
      return (
        state.products.find((product) => product.entitlementId === state.selectedEntitlementId) ??
        null
      );
    },
    summary(state) {
      return summarizeImportRows(state.rows);
    },
    resultSummary(state) {
      return summarizeImportResult(state.rows);
    },
    canReview(state) {
      return state.rows.length > 0;
    },
    canSubmit(state) {
      const summary = summarizeImportRows(state.rows);
      return summary.readyRows > 0 && summary.blockedRows === 0;
    },
    canCommit(state) {
      return Boolean(state.currentJob?.canCommit);
    },
    backendBusy(state) {
      return state.creatingJob || state.validatingJob || state.committingJob || state.pollingJob;
    },
    validationComplete(state) {
      return Boolean(
        state.currentJob &&
          (state.currentJob.status === 'validated' || state.currentJob.status === 'readyToCommit')
      );
    },
    commitComplete(state) {
      return Boolean(state.currentJob && COMMIT_TERMINAL_STATUSES.has(state.currentJob.status));
    },
  },
  actions: {
    clearBackendJob() {
      this.selectedJobId = null;
      this.currentJob = null;
      this.apiError = null;
      this.processStartedAt = null;
      this.processCompletedAt = null;
    },
    applyAvailableProducts(products: Product[]) {
      const options = products.map(mapProductToOption);
      const currentSelection =
        options.find(
          (product) =>
            product.id === this.selectedProductId &&
            product.entitlementId === this.selectedEntitlementId
        ) ?? options.find((product) => product.id === this.selectedProductId);
      const selectedProduct = currentSelection ?? options[0] ?? null;

      this.products = options;
      this.selectedProductId = selectedProduct?.id ?? null;
      this.selectedEntitlementId = selectedProduct?.entitlementId ?? null;
    },
    async loadAvailableProducts(organizationId: string): Promise<ProductOption[]> {
      this.productsLoading = true;
      this.productsError = null;

      try {
        const products = await listProducts({ organizationId });
        this.applyAvailableProducts(products);

        return this.products;
      } catch (error) {
        this.products = [];
        this.selectedProductId = null;
        this.selectedEntitlementId = null;
        this.productsError = getErrorMessage(error);

        return [];
      } finally {
        this.productsLoading = false;
      }
    },
    clearAvailableProducts() {
      this.products = [];
      this.selectedProductId = null;
      this.selectedEntitlementId = null;
      this.productsLoading = false;
      this.productsError = null;
    },
    applyBackendJob(job: BulkImportJobDetail, rows = job.rows) {
      this.currentJob = job;
      this.selectedJobId = job.id;

      if (rows) {
        this.rows = mapBackendRows(rows);
      }

      this.products = this.products.map((product) =>
        product.id === job.productId && product.entitlementId === job.orgProductEntitlementId
          ? {
              ...product,
              allocatedQuantity: job.allocatedBefore,
              purchasedQuantity: job.purchasedQuantity,
            }
          : product
      );

      if (COMMIT_TERMINAL_STATUSES.has(job.status)) {
        this.processCompletedAt = job.completedAt ?? new Date().toISOString();
      }
    },
    selectProduct(productKey: string) {
      const product =
        this.products.find((item) => item.key === productKey) ??
        this.products.find((item) => item.id === productKey);

      if (!product) {
        return;
      }

      this.selectedProductId = product.id;
      this.selectedEntitlementId = product.entitlementId;
      this.clearBackendJob();
    },
    setImportedCsv(file: ImportedCsvFile, rows: ImportCsvRow[]) {
      this.importedFile = file;
      this.rows = normalizeImportRows(rows);
      this.clearBackendJob();
    },
    updateRow(
      rowId: string,
      patch: Partial<
        Pick<ImportCsvRow, 'email' | 'name' | 'department' | 'action' | 'seatQuantity'>
      >
    ) {
      this.clearBackendJob();
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? cloneRowWithPatch(row, patch) : row))
      );
    },
    markRowDeleted(rowId: string) {
      this.clearBackendJob();
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? { ...row, deleted: true } : row))
      );
    },
    undoRowDeleted(rowId: string) {
      this.clearBackendJob();
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? { ...row, deleted: false } : row))
      );
    },
    async createAndValidateCurrentImport(organizationId: string): Promise<BulkImportJobDetail | null> {
      const selectedProduct = this.selectedProduct;

      if (!selectedProduct || !this.importedFile) {
        this.apiError = 'Select an entitlement and CSV file before validation.';
        return null;
      }

      if (!selectedProduct.entitlementId) {
        this.apiError = 'The selected product does not include an entitlement id.';
        return null;
      }

      const activeRows = this.rows.filter((row) => !row.deleted);

      if (activeRows.length === 0) {
        this.apiError = 'The CSV does not contain active rows to import.';
        return null;
      }

      this.creatingJob = true;
      this.validatingJob = false;
      this.apiError = null;

      try {
        const createdJob = await createBulkImportJob({
          fileName: this.importedFile.name,
          organizationId,
          orgProductEntitlementId: selectedProduct.entitlementId,
          productId: selectedProduct.id,
          rows: activeRows.map((row) => ({
            action: String(row.action || 'assign'),
            department: row.department,
            email: row.email,
            name: row.name,
            rowNumber: row.rowNumber,
            seatQuantity: row.seatQuantity ?? 1,
          })),
        });

        this.applyBackendJob(createdJob);
        this.creatingJob = false;
        this.validatingJob = true;

        const validationJob = await validateBulkImportJob(createdJob.id);
        this.applyBackendJob(validationJob);
        await this.pollCurrentJobUntil(VALIDATION_TERMINAL_STATUSES);

        return this.currentJob;
      } catch (error) {
        this.apiError = getErrorMessage(error);
        return null;
      } finally {
        this.creatingJob = false;
        this.validatingJob = false;
      }
    },
    async commitCurrentImport(): Promise<BulkImportJobDetail | null> {
      if (!this.selectedJobId) {
        this.apiError = 'Validate the import before starting commit.';
        return null;
      }

      this.committingJob = true;
      this.apiError = null;
      this.processStartedAt = new Date().toISOString();
      this.processCompletedAt = null;

      try {
        const job = await commitBulkImportJob(this.selectedJobId);
        this.applyBackendJob(job);

        return job;
      } catch (error) {
        this.apiError = getErrorMessage(error);
        return null;
      } finally {
        this.committingJob = false;
      }
    },
    async refreshCurrentJob(): Promise<BulkImportJobDetail | null> {
      if (!this.selectedJobId) {
        return null;
      }

      this.pollingJob = true;

      try {
        const job = await getBulkImportJob(this.selectedJobId);
        let rows: BulkImportJobRow[] | undefined = job.rows;

        try {
          rows = await listBulkImportJobRows(job.id);
        } catch {
          rows = job.rows;
        }

        this.applyBackendJob(job, rows);
        this.apiError = null;

        return job;
      } catch (error) {
        this.apiError = getErrorMessage(error);
        return null;
      } finally {
        this.pollingJob = false;
      }
    },
    async pollCurrentJobUntil(
      terminalStatuses: Set<BulkImportJobStatus>,
      maxAttempts = 60
    ): Promise<BulkImportJobDetail | null> {
      let attempts = 0;

      while (this.selectedJobId && attempts < maxAttempts) {
        const currentJob = this.currentJob;

        if (currentJob && terminalStatuses.has(currentJob.status)) {
          if (!currentJob.rows) {
            await this.refreshCurrentJob();
          }

          return this.currentJob;
        }

        await wait(getPollDelay(currentJob));
        await this.refreshCurrentJob();
        attempts += 1;
      }

      return this.currentJob;
    },
    startMockProcessing() {
      this.selectedJobId = `job-${String(Date.now()).slice(-6)}`;
      this.processStartedAt = new Date().toISOString();
      this.processCompletedAt = null;
    },
    completeMockProcessing() {
      this.processCompletedAt = new Date().toISOString();
    },
    resetImport() {
      this.importedFile = null;
      this.rows = [];
      this.currentJob = null;
      this.selectedJobId = null;
      this.processStartedAt = null;
      this.processCompletedAt = null;
      this.creatingJob = false;
      this.validatingJob = false;
      this.committingJob = false;
      this.pollingJob = false;
      this.apiError = null;
      this.rowStatusFilter = 'all';
    },
  },
});
