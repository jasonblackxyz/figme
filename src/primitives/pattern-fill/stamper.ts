import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { PatternFillConfig, PatternTile } from './types.ts';
import { createBuffer } from '@primitives/stamp-system/buffer.ts';

/**
 * Stamp a repeating pattern fill into a buffer for the given region.
 *
 * Creates a buffer of config.region dimensions and tiles the pattern
 * across it with offset support (config.offsetCol, config.offsetRow).
 * If styleOverride is provided, all tile styles are replaced with that key.
 */
export function stampPatternFill(
  config: PatternFillConfig,
  tile: PatternTile,
): StampBuffer | null {
  const { region, offsetCol, offsetRow, styleOverride } = config;

  if (region.width <= 0 || region.height <= 0) {
    return null;
  }

  const tileHeight = tile.chars.length;
  const tileWidth = tile.chars[0]?.length ?? 0;

  if (tileHeight === 0 || tileWidth === 0) {
    return null;
  }

  const buffer = createBuffer(region.width, region.height);

  for (let r = 0; r < region.height; r++) {
    for (let c = 0; c < region.width; c++) {
      // Apply offset and wrap around tile dimensions
      // Use modular arithmetic with offset to shift the pattern
      const tileR = ((r + offsetRow) % tileHeight + tileHeight) % tileHeight;
      const tileC = ((c + offsetCol) % tileWidth + tileWidth) % tileWidth;

      const char = tile.chars[tileR]?.[tileC];
      const style = styleOverride ?? tile.styles[tileR]?.[tileC];

      if (char !== undefined && style !== undefined) {
        buffer.chars[r]![c] = char;
        buffer.styles[r]![c] = style;
      }
    }
  }

  return buffer;
}
