import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { PatternFillConfig } from './types.ts';
import type { PatternTile } from './types.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';

/**
 * Stamp a repeating pattern fill into a buffer for the given region.
 * Tiles the pattern across the region with offset support.
 * If styleOverride is set, uses it for all cells instead of the tile's styles.
 */
export function stampPatternFill(
  config: PatternFillConfig,
  tile: PatternTile,
): StampBuffer | null {
  const { region, offsetCol, offsetRow, styleOverride } = config;
  const tileHeight = tile.chars.length;
  const tileWidth = tile.chars[0]?.length ?? 0;

  if (tileHeight === 0 || tileWidth === 0) return null;
  if (region.width <= 0 || region.height <= 0) return null;

  const buffer = createBuffer(region.width, region.height);

  for (let r = 0; r < region.height; r++) {
    for (let c = 0; c < region.width; c++) {
      // Compute source tile position with offset (modulo for wrapping)
      const tileRow = ((r + offsetRow) % tileHeight + tileHeight) % tileHeight;
      const tileCol = ((c + offsetCol) % tileWidth + tileWidth) % tileWidth;

      const char = tile.chars[tileRow]?.[tileCol];
      const style = styleOverride ?? tile.styles[tileRow]?.[tileCol];

      if (char !== undefined && style !== undefined) {
        buffer.chars[r]![c] = char;
        buffer.styles[r]![c] = style;
      }
    }
  }

  return buffer;
}
