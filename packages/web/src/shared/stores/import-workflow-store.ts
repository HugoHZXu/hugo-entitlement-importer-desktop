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
  listEntitlements,
  listProducts,
  listBulkImportJobRows,
  validateBulkImportJob,
} from '@/shared/api/client';
import type {
  BulkImportJobDetail,
  BulkImportJobRow,
  BulkImportJobStatus,
  Product,
  ProductEntitlement,
} from '@/shared/types';

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

function mapEntitlementToOption(product: Product, entitlement: ProductEntitlement): ProductOption {
  return {
    allocatedQuantity: entitlement.allocatedQuantity,
    availableQuantity: Math.max(entitlement.purchasedQuantity - entitlement.allocatedQuantity, 0),
    entitlementCode: entitlement.entitlementCode,
    entitlementId: entitlement.id,
    entitlementStatus: entitlement.status,
    id: product.id,
    key: createProductOptionKey(product.id, entitlement.id),
    name: product.name,
    productStatus: product.status,
    purchasedQuantity: entitlement.purchasedQuantity,
  };
}

function hasCreateDtoInvalidSeatQuantity(row: ImportCsvRow): boolean {
  return row.seatQuantity === null || !Number.isInteger(row.seatQuantity) || row.seatQuantity <= 0;
}

function getCreateDtoBlockedRows(rows: ImportCsvRow[]): ImportCsvRow[] {
  return rows.filter((row) => !row.deleted && hasCreateDtoInvalidSeatQuantity(row));
}

function hasCreateReadySeatQuantity(
  row: ImportCsvRow
): row is ImportCsvRow & { seatQuantity: number } {
  return !hasCreateDtoInvalidSeatQuantity(row);
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
    canCreateBackendJob(state) {
      const activeRows = state.rows.filter((row) => !row.deleted);

      return (
        Boolean(state.importedFile && state.selectedProductId && state.selectedEntitlementId) &&
        activeRows.length > 0 &&
        getCreateDtoBlockedRows(state.rows).length === 0
      );
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
    applyAvailableProducts(options: ProductOption[]) {
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
        const entitlementGroups = await Promise.all(
          products.map(async (product) => ({
            entitlements: await listEntitlements({
              organizationId,
              productId: product.id,
            }),
            product,
          }))
        );
        const options = entitlementGroups.flatMap(({ entitlements, product }) =>
          entitlements.map((entitlement) => mapEntitlementToOption(product, entitlement))
        );

        this.applyAvailableProducts(options);

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
      const createBlockedRows = getCreateDtoBlockedRows(this.rows);

      if (activeRows.length === 0) {
        this.apiError = 'The CSV does not contain active rows to import.';
        return null;
      }

      if (createBlockedRows.length > 0) {
        this.apiError = `Fix invalid seat quantities before backend validation. Rows: ${createBlockedRows
          .map((row) => row.rowNumber)
          .join(', ')}.`;
        return null;
      }

      const createRows = activeRows.filter(hasCreateReadySeatQuantity);

      this.creatingJob = true;
      this.validatingJob = false;
      this.apiError = null;

      try {
        const createdJob = await createBulkImportJob({
          fileName: this.importedFile.name,
          organizationId,
          orgProductEntitlementId: selectedProduct.entitlementId,
          productId: selectedProduct.id,
          rows: createRows.map((row) => ({
            action: String(row.action || 'assign'),
            department: row.department,
            email: row.email,
            name: row.name,
            rowNumber: row.rowNumber,
            seatQuantity: row.seatQuantity,
          })),
        });

        this.applyBackendJob(createdJob);
        this.creatingJob = false;
        this.validatingJob = true;

        await validateBulkImportJob(createdJob.id);
        await this.refreshCurrentJob();
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
        await commitBulkImportJob(this.selectedJobId);
        const job = await this.refreshCurrentJob();

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
