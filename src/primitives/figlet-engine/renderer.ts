import type { FigletFont, FigletRenderResult } from './types.ts';

/**
 * Render a text string using a FIGlet font.
 *
 * @experimental Stub — not yet implemented. Returns empty result.
 * Real implementation will render text using parsed FIGlet font data.
 * Deferred to Tier 2 (FIGlet Text tool).
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- TODO: remove when implemented */
export function renderFiglet(
  _text: string,
  _font: FigletFont,
): FigletRenderResult {
  return {
    lines: [],
    width: 0,
    height: 0,
  };
}
/* eslint-enable @typescript-eslint/no-unused-vars */
