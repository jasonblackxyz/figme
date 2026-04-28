import type { FIGMIIPage, Layer, CanvasProperties } from './types.ts';
import { flattenLayerOrder, isEffectivelyHidden } from './hierarchy.ts';

export type ColorOverrideMap = Record<string, { color?: string; bg?: string }>;

/**
 * Compute color overrides from page-level and per-layer custom colors.
 * Pure function — no React or store dependencies.
 */
export function computeColorOverrides(page: FIGMIIPage): ColorOverrideMap {
  const colorOverrides: ColorOverrideMap = {};

  // Seed page-level cell overrides (drawn on bare canvas, below all layers)
  if (page.cellColorOverrides) {
    for (const [key, bgColor] of Object.entries(page.cellColorOverrides)) {
      colorOverrides[key] = { bg: bgColor };
    }
  }

  // Build color overrides from layers (higher z-order overwrites lower)
  for (const layerId of flattenLayerOrder(page)) {
    const layer: Layer | undefined = page.layers[layerId];
    if (!layer || layer.kind === 'group') continue;
    if (isEffectivelyHidden(page, layerId)) continue;

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
        if (relRow != null && relCol != null && Number.isFinite(relRow) && Number.isFinite(relCol)) {
          const absKey = `${row + relRow},${col + relCol}`;
          colorOverrides[absKey] = {
            ...colorOverrides[absKey],
            bg: bgColor,
          };
        }
      }
    }

    // Canvas layers: per-cell fg + bg from CanvasProperties.cellColors
    if (layer.kind === 'canvas') {
      const canvasProps = layer.properties as CanvasProperties;
      if (canvasProps.cellColors) {
        const { col, row } = layer.rect;
        for (const [relKey, colors] of Object.entries(canvasProps.cellColors)) {
          const [relRow, relCol] = relKey.split(',').map(Number);
          if (relRow != null && relCol != null && Number.isFinite(relRow) && Number.isFinite(relCol)) {
            const absKey = `${row + relRow},${col + relCol}`;
            colorOverrides[absKey] = {
              ...colorOverrides[absKey],
              ...colors,
            };
          }
        }
      }
    }
  }

  return colorOverrides;
}
