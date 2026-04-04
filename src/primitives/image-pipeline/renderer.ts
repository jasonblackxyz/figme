import type { ImageRenderConfig, ImageRenderResult } from './types.ts';

/**
 * Render a raster image into an ASCII character grid.
 *
 * Stub: returns an empty result. Real implementation will load the image,
 * apply brightness/contrast, and map pixel brightness to characters.
 */
export function renderImageToAscii(
  _config: ImageRenderConfig,
): ImageRenderResult {
  return {
    chars: [],
    width: 0,
    height: 0,
  };
}
