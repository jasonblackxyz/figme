import { stampPatternFill } from '../stamper.ts';
import { BUILT_IN_PATTERNS } from '../tiles.ts';
import type { PatternFillConfig, PatternTile } from '../types.ts';

describe('stampPatternFill', () => {
  const dotsTile = BUILT_IN_PATTERNS.find((p) => p.id === 'light-dots')!;

  it('returns null for zero-width region', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 0, height: 5 },
      offsetCol: 0,
      offsetRow: 0,
    };
    expect(stampPatternFill(config, dotsTile)).toBeNull();
  });

  it('returns null for zero-height region', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 5, height: 0 },
      offsetCol: 0,
      offsetRow: 0,
    };
    expect(stampPatternFill(config, dotsTile)).toBeNull();
  });

  it('fills a region with tiled pattern', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 4, height: 4 },
      offsetCol: 0,
      offsetRow: 0,
    };
    const buffer = stampPatternFill(config, dotsTile);
    expect(buffer).not.toBeNull();
    expect(buffer!.width).toBe(4);
    expect(buffer!.height).toBe(4);

    // light-dots: [['.', ' '], [' ', '.']]
    // Pattern repeats every 2 cols and 2 rows
    expect(buffer!.chars[0]![0]).toBe('.');
    expect(buffer!.chars[0]![1]).toBe(' ');
    expect(buffer!.chars[0]![2]).toBe('.');
    expect(buffer!.chars[0]![3]).toBe(' ');
    expect(buffer!.chars[1]![0]).toBe(' ');
    expect(buffer!.chars[1]![1]).toBe('.');
    expect(buffer!.chars[1]![2]).toBe(' ');
    expect(buffer!.chars[1]![3]).toBe('.');
  });

  it('applies offset correctly', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 4, height: 2 },
      offsetCol: 1,
      offsetRow: 0,
    };
    const buffer = stampPatternFill(config, dotsTile);
    expect(buffer).not.toBeNull();

    // With offsetCol=1, pattern shifts by 1
    // Tile row 0: ['.', ' '] → with offset 1: [' ', '.']
    expect(buffer!.chars[0]![0]).toBe(' ');
    expect(buffer!.chars[0]![1]).toBe('.');
  });

  it('applies styleOverride to all cells', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 3, height: 3 },
      offsetCol: 0,
      offsetRow: 0,
      styleOverride: 'accentText',
    };
    const buffer = stampPatternFill(config, dotsTile);
    expect(buffer).not.toBeNull();

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(buffer!.styles[r]![c]).toBe('accentText');
      }
    }
  });

  it('handles negative offsets via modular arithmetic', () => {
    const config: PatternFillConfig = {
      tileId: 'light-dots',
      region: { col: 0, row: 0, width: 2, height: 2 },
      offsetCol: -1,
      offsetRow: -1,
    };
    const buffer = stampPatternFill(config, dotsTile);
    expect(buffer).not.toBeNull();
    // Should produce valid characters (not crash)
    expect(buffer!.chars[0]![0]).toBeDefined();
  });

  it('works with single-cell tile patterns', () => {
    const shadeTile = BUILT_IN_PATTERNS.find((p) => p.id === 'light-shade')!;
    const config: PatternFillConfig = {
      tileId: 'light-shade',
      region: { col: 0, row: 0, width: 3, height: 2 },
      offsetCol: 0,
      offsetRow: 0,
    };
    const buffer = stampPatternFill(config, shadeTile);
    expect(buffer).not.toBeNull();

    // All cells should be the shade character
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        expect(buffer!.chars[r]![c]).toBe('░');
      }
    }
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

  it('works with all 9 built-in patterns', () => {
    expect(BUILT_IN_PATTERNS.length).toBe(9);

    for (const tile of BUILT_IN_PATTERNS) {
      const config: PatternFillConfig = {
        tileId: tile.id,
        region: { col: 0, row: 0, width: 6, height: 6 },
        offsetCol: 0,
        offsetRow: 0,
      };
      const buffer = stampPatternFill(config, tile);
      expect(buffer).not.toBeNull();
      expect(buffer!.width).toBe(6);
      expect(buffer!.height).toBe(6);
    }
  });
});
