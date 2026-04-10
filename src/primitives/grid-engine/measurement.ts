import type { GridConfig } from './types.ts';

/**
 * Measure character cell dimensions for a given monospace font configuration.
 * Uses an OffscreenCanvas (or falls back to approximate values) to measure
 * the width of the character 'M' and compute cell height from fontSize * lineHeight.
 */
export function measureCellDimensions(
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
): { cellWidth: number; cellHeight: number } {
  const cellHeight = fontSize * lineHeight;

  // Try to measure using OffscreenCanvas
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText('M');
        return { cellWidth: metrics.width, cellHeight };
      }
      // OffscreenCanvas available but returned null context (e.g., jsdom without
      // canvas package). Skip the document-canvas path to avoid console errors
      // from jsdom's not-implemented handler; use the approximate fallback instead.
      // Trade-off: in a hypothetical environment where OffscreenCanvas 2D is
      // disabled but HTMLCanvasElement 2D works, we'd miss the more accurate
      // measurement. This is acceptable — the approximate fallback is the same
      // value used when no canvas is available at all.
      return { cellWidth: fontSize * 0.6, cellHeight };
    } catch {
      // OffscreenCanvas construction failed — fall through to document canvas
    }
  }

  // Try document canvas as fallback (only reached when OffscreenCanvas is absent)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText('M');
      return { cellWidth: metrics.width, cellHeight };
    }
  }

  // Approximate fallback for environments without canvas
  const cellWidth = fontSize * 0.6;
  return { cellWidth, cellHeight };
}

/**
 * Create a default GridConfig matching the readme-app defaults:
 * IBM Plex Mono, 14px, line-height 1.35.
 */
export function createDefaultGridConfig(): GridConfig {
  const fontFamily = "'IBM Plex Mono', monospace";
  const fontSize = 14;
  const lineHeight = 1.35;

  // Approximate cell dimensions for IBM Plex Mono 14px
  const cellWidth = 8.4;
  const cellHeight = fontSize * lineHeight; // 18.9

  return {
    fontFamily,
    fontSize,
    lineHeight,
    cellWidth,
    cellHeight,
    canvasCols: Math.floor(1920 / cellWidth),
    canvasRows: Math.floor(1080 / cellHeight),
  };
}
