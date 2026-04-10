import { brightnessGridToAscii, renderImageToAscii } from '../renderer.ts';

describe('brightnessGridToAscii', () => {
  describe('classic style', () => {
    it('maps 0 brightness to space', () => {
      const grid = [[0]];
      const result = brightnessGridToAscii(grid, 'classic', 0, 1, false);
      expect(result.chars[0]![0]).toBe(' ');
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
    });

    it('maps full brightness to @', () => {
      const grid = [[0.99]];
      const result = brightnessGridToAscii(grid, 'classic', 0, 1, false);
      expect(result.chars[0]![0]).toBe('@');
    });

    it('maps a small grid correctly', () => {
      const grid = [
        [0, 0.5, 1],
        [0.2, 0.7, 0.9],
      ];
      const result = brightnessGridToAscii(grid, 'classic', 0, 1, false);
      expect(result.width).toBe(3);
      expect(result.height).toBe(2);
      expect(result.chars.length).toBe(2);
      expect(result.chars[0]!.length).toBe(3);
    });

    it('applies brightness adjustment', () => {
      const grid = [[0.3]];
      // Adding brightness pushes value higher
      const normal = brightnessGridToAscii(grid, 'classic', 0, 1, false);
      const bright = brightnessGridToAscii(grid, 'classic', 0.3, 1, false);
      // The brighter version should map to a denser char
      const ramp = ' .:-=+*#%@';
      const normalIdx = ramp.indexOf(normal.chars[0]![0]!);
      const brightIdx = ramp.indexOf(bright.chars[0]![0]!);
      expect(brightIdx).toBeGreaterThanOrEqual(normalIdx);
    });

    it('applies contrast adjustment', () => {
      const grid = [[0.6]];
      // Higher contrast exaggerates deviation from 0.5
      const low = brightnessGridToAscii(grid, 'classic', 0, 0.5, false);
      const high = brightnessGridToAscii(grid, 'classic', 0, 2, false);
      const ramp = ' .:-=+*#%@';
      const lowIdx = ramp.indexOf(low.chars[0]![0]!);
      const highIdx = ramp.indexOf(high.chars[0]![0]!);
      expect(highIdx).toBeGreaterThanOrEqual(lowIdx);
    });

    it('inverts brightness', () => {
      const grid = [[0]];
      const normal = brightnessGridToAscii(grid, 'classic', 0, 1, false);
      const inverted = brightnessGridToAscii(grid, 'classic', 0, 1, true);
      // Normal: 0 brightness → space. Inverted: 0 → 1 → @
      expect(normal.chars[0]![0]).toBe(' ');
      expect(inverted.chars[0]![0]).toBe('@');
    });
  });

  describe('hatch style', () => {
    it('maps brightness to block elements', () => {
      const grid = [[0, 0.5, 0.99]];
      const result = brightnessGridToAscii(grid, 'hatch', 0, 1, false);
      expect(result.chars[0]![0]).toBe(' ');
      // Mid values should be shade characters
      expect('░▒▓█'.includes(result.chars[0]![1]!)).toBe(true);
      expect(result.chars[0]![2]).toBe('█');
    });
  });

  describe('braille style', () => {
    it('reduces dimensions by 2x4 factor', () => {
      // 4 cols x 8 rows → 2 cols x 2 rows of braille chars
      const grid: number[][] = [];
      for (let r = 0; r < 8; r++) {
        const row: number[] = [];
        for (let c = 0; c < 4; c++) {
          row.push(0.8);
        }
        grid.push(row);
      }
      const result = brightnessGridToAscii(grid, 'braille', 0, 1, false);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    it('returns braille blank for all-zero block', () => {
      const grid: number[][] = [];
      for (let r = 0; r < 4; r++) {
        grid.push([0, 0]);
      }
      const result = brightnessGridToAscii(grid, 'braille', 0, 1, false);
      // All below threshold → blank braille U+2800
      expect(result.chars[0]![0]).toBe('\u2800');
    });

    it('returns filled braille for all-one block', () => {
      const grid: number[][] = [];
      for (let r = 0; r < 4; r++) {
        grid.push([1, 1]);
      }
      const result = brightnessGridToAscii(grid, 'braille', 0, 1, false);
      // All dots filled → U+28FF
      expect(result.chars[0]![0]).toBe('\u28FF');
    });
  });

  describe('edge cases', () => {
    it('returns empty result for empty grid', () => {
      const result = brightnessGridToAscii([], 'classic', 0, 1, false);
      expect(result.chars).toEqual([]);
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });
  });
});

// renderImageToAscii is a Tier-2 stub (deferred per CLAUDE.md @experimental).
// This test documents the stub contract so future implementers have a clear baseline.
describe('renderImageToAscii', () => {
  it('returns empty stub result (Tier 2 placeholder)', () => {
    const result = renderImageToAscii({
      src: 'test.png',
      style: 'classic',
      targetCols: 10,
      targetRows: 5,
      brightness: 0,
      contrast: 1,
      invert: false,
    });
    expect(result).toEqual({ chars: [], width: 0, height: 0 });
  });
});
