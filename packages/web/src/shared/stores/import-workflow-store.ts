import { defineStore } from 'pinia';

import type { ImportCsvRow, ImportedCsvFile } from '@/features/importer/importer-types';
import {
  cloneRowWithPatch,
  normalizeImportRows,
  summarizeImportResult,
  summarizeImportRows,
} from '@/features/importer/importer-validation';

const productOptions = [
  {
    id: 'prod-insight-studio',
    name: 'Insight Studio',
    entitlementId: 'ent-insight-studio-2026',
    entitlementCode: 'LIC-INSIGHT-STUDIO-2026',
    purchasedQuantity: 75,
    allocatedQuantity: 28,
  },
  {
    id: 'prod-workflow-hub',
    name: 'Workflow Hub',
    entitlementId: 'ent-workflow-hub-2026',
    entitlementCode: 'LIC-WORKFLOW-HUB-2026',
    purchasedQuantity: 120,
    allocatedQuantity: 64,
  },
];

export const useImportWorkflowStore = defineStore('importWorkflow', {
  state: () => ({
    products: productOptions,
    selectedProductId: productOptions[0]?.id ?? null,
    selectedEntitlementId: productOptions[0]?.entitlementId ?? null,
    selectedJobId: null as string | null,
    rowStatusFilter: 'all',
    importedFile: null as ImportedCsvFile | null,
    rows: [] as ImportCsvRow[],
    processStartedAt: null as string | null,
    processCompletedAt: null as string | null,
  }),
  getters: {
    selectedProduct(state) {
      return state.products.find((product) => product.id === state.selectedProductId) ?? null;
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
  },
  actions: {
    selectProduct(productId: string) {
      const product = this.products.find((item) => item.id === productId);

      if (!product) {
        return;
      }

      this.selectedProductId = product.id;
      this.selectedEntitlementId = product.entitlementId;
    },
    setImportedCsv(file: ImportedCsvFile, rows: ImportCsvRow[]) {
      this.importedFile = file;
      this.rows = normalizeImportRows(rows);
      this.selectedJobId = null;
      this.processStartedAt = null;
      this.processCompletedAt = null;
    },
    updateRow(
      rowId: string,
      patch: Partial<
        Pick<ImportCsvRow, 'email' | 'name' | 'department' | 'action' | 'seatQuantity' | 'note'>
      >
    ) {
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? cloneRowWithPatch(row, patch) : row))
      );
    },
    markRowDeleted(rowId: string) {
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? { ...row, deleted: true } : row))
      );
    },
    undoRowDeleted(rowId: string) {
      this.rows = normalizeImportRows(
        this.rows.map((row) => (row.id === rowId ? { ...row, deleted: false } : row))
      );
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
      this.selectedJobId = null;
      this.processStartedAt = null;
      this.processCompletedAt = null;
      this.rowStatusFilter = 'all';
    },
  },
});
