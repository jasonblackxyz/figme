import { useMemo } from 'react';
import type { FigMePage } from '@primitives/document-model/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';

export type ColorOverrideMap = Record<string, { color?: string; bg?: string }>;

export interface ComposedBufferResult {
  buffer: StampBuffer;
  colorOverrides: ColorOverrideMap;
}

export function useComposedBuffer(page: FigMePage, gridConfig: GridConfig): ComposedBufferResult {
  const editingLayerId = useUiStore((s) => s.editingLayerId);

  return useMemo(() => {
    const buffer = composePageBuffer(page, gridConfig, editingLayerId);
    const colorOverrides: ColorOverrideMap = {};

    // Seed page-level cell overrides (drawn on bare canvas, below all layers)
    if (page.cellColorOverrides) {
      for (const [key, bgColor] of Object.entries(page.cellColorOverrides)) {
        colorOverrides[key] = { bg: bgColor };
      }
    }

    // Build color overrides from layers (higher z-order overwrites lower)
    for (const layerId of page.layerOrder) {
      const layer = page.layers[layerId];
      if (!layer || !layer.visible) continue;

      if (layer.customColors) {
        const { col, row, width, height } = layer.rect;
        for (let r = row; r < row + height; r++) {
          for (let c = col; c < col + width; c++) {
            colorOverrides[`${r},${c}`] = {
              ...colorOverrides[`${r},${c}`],
              ...layer.customColors,
            };
          }
        }
      }

      if (layer.cellColorOverrides) {
        const { col, row } = layer.rect;
        for (const [relKey, bgColor] of Object.entries(layer.cellColorOverrides)) {
          const [relRow, relCol] = relKey.split(',').map(Number);
          if (relRow !== undefined && relCol !== undefined) {
            const absKey = `${row + relRow},${col + relCol}`;
            colorOverrides[absKey] = {
              ...colorOverrides[absKey],
              bg: bgColor,
            };
          }
        }
      }
    }

    return { buffer, colorOverrides };
  }, [page, gridConfig, editingLayerId]);
}
