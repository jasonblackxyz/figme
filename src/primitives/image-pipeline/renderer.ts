import type { ImageRenderConfig, ImageRenderResult } from './types.ts';

/**
 * Render a raster image into an ASCII character grid.
 *
 * @experimental Stub — not yet implemented. Returns empty result.
 * Real implementation will load the image, apply brightness/contrast,
 * and map pixel brightness to characters. Deferred to Tier 2 (Image tool).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function renderImageToAscii(
  _config: ImageRenderConfig,
): ImageRenderResult {
  return {
    chars: [],
    width: 0,
    height: 0,
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */
