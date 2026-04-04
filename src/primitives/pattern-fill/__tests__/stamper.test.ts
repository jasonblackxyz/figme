import { describe, it, expect } from 'vitest';
import { stampPatternFill } from '../stamper.ts';
import type { PatternTile } from '../types.ts';
import type { PatternFillConfig } from '../types.ts';
import type { StyleKey } from '@primitives/style-system/types.ts';

const dotTile: PatternTile = {
  id: 'dot-2x2',
  name: 'Dots',
  chars: [
    ['.', ' '],
    [' ', '.'],
  ],
  styles: [
    ['dim' as StyleKey, 'bg' as StyleKey],
    ['bg' as StyleKey, 'dim' as StyleKey],
  ],
  category: 'dots',
};

describe('stampPatternFill', () => {
  it('tiles a 2x2 pattern across a 4x4 region', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 4, height: 4 },
      offsetCol: 0,
      offsetRow: 0,
    };

    const result = stampPatternFill(config, dotTile);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(4);
    expect(result!.height).toBe(4);

    // Pattern repeats: row 0 = ". ." (cols 0,2 are '.', cols 1,3 are ' ')
    expect(result!.chars[0]![0]).toBe('.');
    expect(result!.chars[0]![1]).toBe(' ');
    expect(result!.chars[0]![2]).toBe('.');
    expect(result!.chars[0]![3]).toBe(' ');

    // row 1 = " . " (cols 0,2 are ' ', cols 1,3 are '.')
    expect(result!.chars[1]![0]).toBe(' ');
    expect(result!.chars[1]![1]).toBe('.');
    expect(result!.chars[1]![2]).toBe(' ');
    expect(result!.chars[1]![3]).toBe('.');

    // Styles match the pattern
    expect(result!.styles[0]![0]).toBe('dim');
    expect(result!.styles[0]![1]).toBe('bg');
    expect(result!.styles[1]![0]).toBe('bg');
    expect(result!.styles[1]![1]).toBe('dim');
  });

  it('applies column offset', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 2, height: 2 },
      offsetCol: 1,
      offsetRow: 0,
    };

    const result = stampPatternFill(config, dotTile);
    expect(result).not.toBeNull();
    // With offsetCol=1, col 0 reads from tile col 1, col 1 reads from tile col 0
    expect(result!.chars[0]![0]).toBe(' '); // tile[0][1]
    expect(result!.chars[0]![1]).toBe('.'); // tile[0][0]
  });

  it('applies row offset', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 2, height: 2 },
      offsetCol: 0,
      offsetRow: 1,
    };

    const result = stampPatternFill(config, dotTile);
    expect(result).not.toBeNull();
    // With offsetRow=1, row 0 reads from tile row 1
    expect(result!.chars[0]![0]).toBe(' '); // tile[1][0]
    expect(result!.chars[0]![1]).toBe('.'); // tile[1][1]
  });

  it('applies style override', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 2, height: 2 },
      offsetCol: 0,
      offsetRow: 0,
      styleOverride: 'accentText' as StyleKey,
    };

    const result = stampPatternFill(config, dotTile);
    expect(result).not.toBeNull();
    // All styles should be overridden
    expect(result!.styles[0]![0]).toBe('accentText');
    expect(result!.styles[0]![1]).toBe('accentText');
    expect(result!.styles[1]![0]).toBe('accentText');
    expect(result!.styles[1]![1]).toBe('accentText');
    // Characters should still come from the tile
    expect(result!.chars[0]![0]).toBe('.');
  });

  it('handles non-divisible region sizes', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 3, height: 3 },
      offsetCol: 0,
      offsetRow: 0,
    };

    const result = stampPatternFill(config, dotTile);
    expect(result).not.toBeNull();
    expect(result!.width).toBe(3);
    expect(result!.height).toBe(3);
    // Row 2 should wrap back to tile row 0
    expect(result!.chars[2]![0]).toBe('.');
    expect(result!.chars[2]![1]).toBe(' ');
    expect(result!.chars[2]![2]).toBe('.');
  });

  it('returns null for empty tile', () => {
    const emptyTile: PatternTile = {
      id: 'empty',
      name: 'Empty',
      chars: [],
      styles: [],
      category: 'custom',
    };

    const config: PatternFillConfig = {
      tileId: 'empty',
      region: { col: 0, row: 0, width: 4, height: 4 },
      offsetCol: 0,
      offsetRow: 0,
    };

    expect(stampPatternFill(config, emptyTile)).toBeNull();
  });

  it('returns null for zero-size region', () => {
    const config: PatternFillConfig = {
      tileId: 'dot-2x2',
      region: { col: 0, row: 0, width: 0, height: 4 },
      offsetCol: 0,
      offsetRow: 0,
    };

    expect(stampPatternFill(config, dotTile)).toBeNull();
  });
});
