import type { ViewportPreset } from './types.ts';

/** Default cell dimensions matching IBM Plex Mono 14px / 1.35 line-height */
const DEFAULT_CELL_WIDTH = 8.4;
const DEFAULT_CELL_HEIGHT = 18.9;

/**
 * Compute cols/rows for a given pixel dimension and cell size.
 */
export function computePreset(
  widthPx: number,
  heightPx: number,
  cellWidth: number,
  cellHeight: number,
): ViewportPreset {
  return {
    name: `Custom ${widthPx}\u00D7${heightPx}`,
    widthPx,
    heightPx,
    cols: Math.floor(widthPx / cellWidth),
    rows: Math.floor(heightPx / cellHeight),
  };
}

/**
 * Built-in viewport size presets.
 * Cols/rows are computed with the default IBM Plex Mono 14px cell dimensions.
 */
export const VIEWPORT_PRESETS: ViewportPreset[] = [
  {
    name: 'Desktop 1920\u00D71080',
    widthPx: 1920,
    heightPx: 1080,
    cols: Math.floor(1920 / DEFAULT_CELL_WIDTH),
    rows: Math.floor(1080 / DEFAULT_CELL_HEIGHT),
  },
  {
    name: 'Laptop 1440\u00D7900',
    widthPx: 1440,
    heightPx: 900,
    cols: Math.floor(1440 / DEFAULT_CELL_WIDTH),
    rows: Math.floor(900 / DEFAULT_CELL_HEIGHT),
  },
  {
    name: 'Small 1280\u00D7720',
    widthPx: 1280,
    heightPx: 720,
    cols: Math.floor(1280 / DEFAULT_CELL_WIDTH),
    rows: Math.floor(720 / DEFAULT_CELL_HEIGHT),
  },
  {
    name: 'QHD 2560\u00D71440',
    widthPx: 2560,
    heightPx: 1440,
    cols: Math.floor(2560 / DEFAULT_CELL_WIDTH),
    rows: Math.floor(1440 / DEFAULT_CELL_HEIGHT),
  },
  {
    name: 'Custom 800\u00D7600',
    widthPx: 800,
    heightPx: 600,
    cols: Math.floor(800 / DEFAULT_CELL_WIDTH),
    rows: Math.floor(600 / DEFAULT_CELL_HEIGHT),
  },
];
