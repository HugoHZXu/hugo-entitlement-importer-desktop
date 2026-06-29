export interface G2ChartHandle {
  destroy(): void;
}

export function createChartPlaceholder(): G2ChartHandle {
  return {
    destroy() {
      // The real G2 lifecycle will be implemented with import result charts.
    },
  };
}

