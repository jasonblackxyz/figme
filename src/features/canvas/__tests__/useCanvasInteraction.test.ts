import { clientToGrid } from '@features/canvas/useCanvasInteraction.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';

describe('clientToGrid', () => {
  const baseConfig: GridConfig = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    lineHeight: 1.35,
    cellWidth: 8.4,
    cellHeight: 18.9,
    canvasCols: 228,
    canvasRows: 57,
  };

  it('converts client coordinates to grid position with no pan', () => {
    const canvasRect = { left: 100, top: 50 } as DOMRect;
    const result = clientToGrid(184, 106.9, canvasRect, 0, 0, baseConfig);
    // x = 184 - 100 - 0 = 84 → col = floor(84 / 8.4) = 10
    // y = 106.9 - 50 - 0 = 56.9 → row = floor(56.9 / 18.9) = 3
    expect(result.col).toBe(10);
    expect(result.row).toBe(3);
  });

  it('accounts for pan offset', () => {
    const canvasRect = { left: 0, top: 0 } as DOMRect;
    // panX = -84, so x = 100 - 0 - (-84) = 184 → col = floor(184 / 8.4) = 21
    const result = clientToGrid(100, 100, canvasRect, -84, -18.9, baseConfig);
    expect(result.col).toBe(Math.floor(184 / 8.4));
    expect(result.row).toBe(Math.floor(118.9 / 18.9));
  });

  it('returns negative grid positions for off-canvas clicks', () => {
    const canvasRect = { left: 200, top: 200 } as DOMRect;
    const result = clientToGrid(100, 100, canvasRect, 0, 0, baseConfig);
    // x = 100 - 200 - 0 = -100 → col = floor(-100 / 8.4) = -12
    expect(result.col).toBeLessThan(0);
    expect(result.row).toBeLessThan(0);
  });

  it('handles zoom-adjusted cell dimensions', () => {
    // At zoom 2, cell dimensions are different
    const zoomedConfig: GridConfig = {
      ...baseConfig,
      fontSize: 28,
      cellWidth: 16.8,
      cellHeight: 37.8,
    };
    const canvasRect = { left: 0, top: 0 } as DOMRect;
    const result = clientToGrid(33.6, 75.6, canvasRect, 0, 0, zoomedConfig);
    // col = floor(33.6 / 16.8) = 2
    // row = floor(75.6 / 37.8) = 2
    expect(result.col).toBe(2);
    expect(result.row).toBe(2);
  });
});
