import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { CanvasProperties, FIGMIIPage, Layer } from './types.ts';
import { flattenLayerOrder, isEffectivelyHidden } from './hierarchy.ts';

export interface PageCanvasSizeInfo {
  pageId: string;
  defaultCols: number;
  defaultRows: number;
  effectiveCols: number;
  effectiveRows: number;
  isOverridden: boolean;
}

export interface PageContentBounds {
  cols: number;
  rows: number;
}

export function getPageCanvasSizeInfo(
  page: Pick<FIGMIIPage, 'id' | 'canvasColsOverride' | 'canvasRowsOverride'>,
  gridConfig: Pick<GridConfig, 'canvasCols' | 'canvasRows'>,
): PageCanvasSizeInfo {
  const defaultCols = gridConfig.canvasCols;
  const defaultRows = gridConfig.canvasRows;
  const effectiveCols = page.canvasColsOverride ?? defaultCols;
  const effectiveRows = page.canvasRowsOverride ?? defaultRows;

  return {
    pageId: page.id,
    defaultCols,
    defaultRows,
    effectiveCols,
    effectiveRows,
    isOverridden: effectiveCols !== defaultCols || effectiveRows !== defaultRows,
  };
}

export function applyPageCanvasSizeToGridConfig(
  page: Pick<FIGMIIPage, 'id' | 'canvasColsOverride' | 'canvasRowsOverride'>,
  gridConfig: GridConfig,
): GridConfig {
  const { effectiveCols, effectiveRows } = getPageCanvasSizeInfo(page, gridConfig);

  return {
    ...gridConfig,
    canvasCols: effectiveCols,
    canvasRows: effectiveRows,
  };
}

export function getVisiblePageContentBounds(page: FIGMIIPage): PageContentBounds {
  let maxCol = 0;
  let maxRow = 0;

  const updateBounds = (col: number, row: number) => {
    if (!Number.isFinite(col) || !Number.isFinite(row)) return;
    maxCol = Math.max(maxCol, col + 1);
    maxRow = Math.max(maxRow, row + 1);
  };

  if (page.cellColorOverrides) {
    for (const key of Object.keys(page.cellColorOverrides)) {
      const [row, col] = key.split(',').map(Number);
      if (row != null && col != null) {
        updateBounds(col, row);
      }
    }
  }

  for (const layerId of flattenLayerOrder(page)) {
    const layer: Layer | undefined = page.layers[layerId];
    if (!layer || layer.kind === 'group') continue;
    if (isEffectivelyHidden(page, layerId)) continue;

    if (layer.kind === 'canvas') {
      const canvasProps = layer.properties as CanvasProperties;
      const contentLines = canvasProps.content.split('\n');

      for (let relRow = 0; relRow < Math.min(contentLines.length, layer.rect.height); relRow++) {
        const line = contentLines[relRow] ?? '';
        for (let relCol = 0; relCol < Math.min(line.length, layer.rect.width); relCol++) {
          if (line[relCol] !== ' ') {
            updateBounds(layer.rect.col + relCol, layer.rect.row + relRow);
          }
        }
      }
    } else {
      maxCol = Math.max(maxCol, layer.rect.col + layer.rect.width);
      maxRow = Math.max(maxRow, layer.rect.row + layer.rect.height);
    }

    if (layer.cellColorOverrides) {
      for (const key of Object.keys(layer.cellColorOverrides)) {
        const [relRow, relCol] = key.split(',').map(Number);
        if (relRow != null && relCol != null) {
          updateBounds(layer.rect.col + relCol, layer.rect.row + relRow);
        }
      }
    }

    if (layer.kind === 'canvas') {
      const canvasProps = layer.properties as CanvasProperties;
      for (const key of Object.keys(canvasProps.cellColors)) {
        const [relRow, relCol] = key.split(',').map(Number);
        if (relRow != null && relCol != null) {
          updateBounds(layer.rect.col + relCol, layer.rect.row + relRow);
        }
      }
    }
  }

  return { cols: maxCol, rows: maxRow };
}
