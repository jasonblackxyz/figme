import { useMemo } from 'react';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { measureCellDimensions } from '@primitives/grid-engine/measurement.ts';
import { useDocumentStore } from '@stores/documentStore.ts';

/**
 * Hook that provides the current grid configuration with measured cell dimensions.
 * Re-measures when font parameters change in the document's gridConfig.
 */
export function useGridMeasurement(): GridConfig {
  const gridConfig = useDocumentStore(s => s.document.gridConfig);

  const measured = useMemo(() => {
    const { cellWidth, cellHeight } = measureCellDimensions(
      gridConfig.fontFamily,
      gridConfig.fontSize,
      gridConfig.lineHeight,
    );

    return {
      ...gridConfig,
      cellWidth,
      cellHeight,
      canvasCols: gridConfig.canvasCols,
      canvasRows: gridConfig.canvasRows,
    };
  }, [gridConfig]);

  return measured;
}
