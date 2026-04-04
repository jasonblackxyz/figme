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

  // Try to measure using canvas 2D context
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(100, 100);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      const metrics = ctx.measureText('M');
      return { cellWidth: metrics.width, cellHeight };
    }
  }

  // Try document canvas as fallback
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
