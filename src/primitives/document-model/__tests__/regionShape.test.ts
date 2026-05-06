import {
  boundingRectFromCells,
  cellInShape,
  computeExclude,
  expandShapeToCells,
  findRegionAtCell,
  unionRect,
} from '@primitives/document-model/regionShape.ts';
import type { SemanticRegion } from '@primitives/document-model/types.ts';

describe('regionShape primitives', () => {
  describe('boundingRectFromCells', () => {
    it('returns 0×0 for empty input', () => {
      expect(boundingRectFromCells([])).toEqual({ col: 0, row: 0, width: 0, height: 0 });
    });
    it('returns single-cell rect for one cell', () => {
      expect(boundingRectFromCells([{ col: 5, row: 7 }])).toEqual({ col: 5, row: 7, width: 1, height: 1 });
    });
    it('computes correct bounds for arbitrary cells', () => {
      const rect = boundingRectFromCells([
        { col: 2, row: 3 },
        { col: 6, row: 4 },
        { col: 4, row: 7 },
      ]);
      expect(rect).toEqual({ col: 2, row: 3, width: 5, height: 5 });
    });
  });

  describe('computeExclude', () => {
    it('returns empty for a fully-filled rect', () => {
      const cells = [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 0, row: 1 },
        { col: 1, row: 1 },
      ];
      const rect = boundingRectFromCells(cells);
      expect(computeExclude(rect, cells)).toEqual([]);
    });
    it('lists cells absent from the included set', () => {
      // L-shape (missing top-right cell)
      const cells = [
        { col: 0, row: 0 },
        { col: 0, row: 1 },
        { col: 1, row: 1 },
      ];
      const rect = boundingRectFromCells(cells);
      expect(computeExclude(rect, cells)).toEqual([{ row: 0, col: 1 }]);
    });
  });

  describe('cellInShape', () => {
    it('matches inside the rect when no exclude', () => {
      expect(
        cellInShape({ rect: { col: 1, row: 1, width: 3, height: 3 } }, { col: 2, row: 2 }),
      ).toBe(true);
      expect(
        cellInShape({ rect: { col: 1, row: 1, width: 3, height: 3 } }, { col: 5, row: 2 }),
      ).toBe(false);
    });
    it('rejects excluded cells', () => {
      expect(
        cellInShape(
          { rect: { col: 0, row: 0, width: 3, height: 3 }, exclude: [{ col: 1, row: 1 }] },
          { col: 1, row: 1 },
        ),
      ).toBe(false);
    });
  });

  describe('findRegionAtCell', () => {
    const regions: Record<string, SemanticRegion> = {
      r1: {
        id: 'r1',
        componentKind: 'frame',
        shape: { rect: { col: 0, row: 0, width: 5, height: 5 } },
      },
      r2: {
        id: 'r2',
        componentKind: 'button',
        shape: { rect: { col: 1, row: 1, width: 2, height: 2 } },
        z: 2,
      },
    };
    it('returns the topmost region for an overlap by z', () => {
      const region = findRegionAtCell(regions, ['r1', 'r2'], { col: 2, row: 2 });
      expect(region?.id).toBe('r2');
    });
    it('returns the underlying region outside overlap', () => {
      const region = findRegionAtCell(regions, ['r1', 'r2'], { col: 4, row: 4 });
      expect(region?.id).toBe('r1');
    });
    it('returns undefined when no region contains the cell', () => {
      expect(findRegionAtCell(regions, ['r1', 'r2'], { col: 10, row: 10 })).toBeUndefined();
    });
  });

  describe('expandShapeToCells', () => {
    it('skips excluded cells', () => {
      const cells = expandShapeToCells({
        rect: { col: 0, row: 0, width: 2, height: 2 },
        exclude: [{ col: 1, row: 1 }],
      });
      expect(cells).toHaveLength(3);
      expect(cells).toContainEqual({ row: 0, col: 0 });
      expect(cells).toContainEqual({ row: 0, col: 1 });
      expect(cells).toContainEqual({ row: 1, col: 0 });
    });
  });

  describe('unionRect', () => {
    it('returns null for empty input', () => {
      expect(unionRect([])).toBeNull();
    });
    it('combines multiple rects', () => {
      const u = unionRect([
        { col: 0, row: 0, width: 2, height: 2 },
        { col: 5, row: 1, width: 3, height: 4 },
      ]);
      expect(u).toEqual({ col: 0, row: 0, width: 8, height: 5 });
    });
  });
});
