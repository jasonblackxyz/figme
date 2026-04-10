import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement HTMLCanvasElement.prototype.getContext, emitting
// "Not implemented" console errors whenever canvas-dependent code runs in tests.
// Provide a minimal font-aware mock so measureCellDimensions (and any other code
// using only measureText) works correctly. Code that needs the full canvas API
// (e.g., brightness.ts measureWithCanvas) wraps its operations in try/catch and
// falls back to its own lookup table when methods like fillRect are missing.
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
  let font = '';
  return {
    get font() { return font; },
    set font(v: string) { font = v; },
    measureText: () => {
      const match = font.match(/(\d+(?:\.\d+)?)px/);
      const size = match ? parseFloat(match[1]!) : 14;
      return { width: size * 0.6 } as TextMetrics;
    },
  } as unknown as CanvasRenderingContext2D;
});
