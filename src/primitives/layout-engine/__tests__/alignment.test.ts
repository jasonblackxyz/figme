import { computeAlignment } from '../alignment.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

describe('computeAlignment', () => {
  const rects: Record<string, GridRect> = {
    a: { col: 5, row: 10, width: 8, height: 4 },
    b: { col: 10, row: 20, width: 6, height: 3 },
    c: { col: 2, row: 15, width: 10, height: 5 },
  };

  it('returns empty positions for empty input', () => {
    const result = computeAlignment({}, 'align-left');
    expect(result.newPositions).toEqual({});
  });

  it('align-left: aligns all left edges to the leftmost', () => {
    const result = computeAlignment(rects, 'align-left');
    // Leftmost col is 2 (rect c)
    expect(result.newPositions['a']!.col).toBe(2);
    expect(result.newPositions['b']!.col).toBe(2);
    expect(result.newPositions['c']!.col).toBe(2);
    // Row should be preserved
    expect(result.newPositions['a']!.row).toBe(10);
    expect(result.newPositions['b']!.row).toBe(20);
    expect(result.newPositions['c']!.row).toBe(15);
  });

  it('align-right: aligns all right edges to the rightmost', () => {
    const result = computeAlignment(rects, 'align-right');
    // Rightmost right edge: b = 16, a = 13, c = 12 → max = 16
    expect(result.newPositions['a']!.col).toBe(16 - 8); // 8
    expect(result.newPositions['b']!.col).toBe(16 - 6); // 10
    expect(result.newPositions['c']!.col).toBe(16 - 10); // 6
  });

  it('align-top: aligns all top edges to the topmost', () => {
    const result = computeAlignment(rects, 'align-top');
    // Topmost row is 10 (rect a)
    expect(result.newPositions['a']!.row).toBe(10);
    expect(result.newPositions['b']!.row).toBe(10);
    expect(result.newPositions['c']!.row).toBe(10);
    // Col should be preserved
    expect(result.newPositions['a']!.col).toBe(5);
    expect(result.newPositions['b']!.col).toBe(10);
    expect(result.newPositions['c']!.col).toBe(2);
  });

  it('align-bottom: aligns all bottom edges to the bottommost', () => {
    const result = computeAlignment(rects, 'align-bottom');
    // Bottom edges: a=14, b=23, c=20 → max = 23
    expect(result.newPositions['a']!.row).toBe(23 - 4); // 19
    expect(result.newPositions['b']!.row).toBe(23 - 3); // 20
    expect(result.newPositions['c']!.row).toBe(23 - 5); // 18
  });

  it('align-center-h: centers all rects horizontally on bounding box center', () => {
    const result = computeAlignment(rects, 'align-center-h');
    // Bounding box: col range [2, 16] → center = floor(18/2) = 9
    const center = Math.floor((2 + 16) / 2);
    expect(result.newPositions['a']!.col).toBe(center - Math.floor(8 / 2)); // 9-4=5
    expect(result.newPositions['b']!.col).toBe(center - Math.floor(6 / 2)); // 9-3=6
    expect(result.newPositions['c']!.col).toBe(center - Math.floor(10 / 2)); // 9-5=4
  });

  it('align-center-v: centers all rects vertically on bounding box center', () => {
    const result = computeAlignment(rects, 'align-center-v');
    // Bounding box: row range [10, 23] → center = floor(33/2) = 16
    const center = Math.floor((10 + 23) / 2);
    expect(result.newPositions['a']!.row).toBe(center - Math.floor(4 / 2)); // 16-2=14
    expect(result.newPositions['b']!.row).toBe(center - Math.floor(3 / 2)); // 16-1=15
    expect(result.newPositions['c']!.row).toBe(center - Math.floor(5 / 2)); // 16-2=14
  });

  it('distribute-h: distributes rects with equal horizontal gaps', () => {
    const distribRects: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 4, height: 3 },
      b: { col: 20, row: 0, width: 4, height: 3 },
      c: { col: 8, row: 0, width: 4, height: 3 },
    };

    const result = computeAlignment(distribRects, 'distribute-h');
    // Sorted by col: a(0), c(8), b(20)
    // Total space: 24 (right edge of b) - 0 = 24
    // Total rect width: 4+4+4 = 12
    // Total gap space: 24 - 12 = 12
    // 2 gaps: 12/2 = 6 each
    expect(result.newPositions['a']!.col).toBe(0);
    expect(result.newPositions['c']!.col).toBe(10); // 0 + 4 + 6
    expect(result.newPositions['b']!.col).toBe(20); // 10 + 4 + 6
  });

  it('distribute-h: handles uneven spacing with remainder', () => {
    const distribRects: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 3, height: 2 },
      b: { col: 20, row: 0, width: 3, height: 2 },
      c: { col: 10, row: 0, width: 3, height: 2 },
      d: { col: 15, row: 0, width: 3, height: 2 },
    };

    const result = computeAlignment(distribRects, 'distribute-h');
    // Sorted by col: a(0), c(10), d(15), b(20)
    // Total space = 23 - 0 = 23, total width = 12, gap space = 11
    // 3 gaps: floor(11/3) = 3, remainder = 2
    // First 2 gaps get +1: gap = 4, 4, 3
    expect(result.newPositions['a']!.col).toBe(0);
    expect(result.newPositions['c']!.col).toBe(7);  // 0 + 3 + 4
    expect(result.newPositions['d']!.col).toBe(14); // 7 + 3 + 4
    expect(result.newPositions['b']!.col).toBe(20); // 14 + 3 + 3
  });

  it('distribute-v: distributes rects with equal vertical gaps', () => {
    const distribRects: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 3, height: 4 },
      b: { col: 0, row: 20, width: 3, height: 4 },
      c: { col: 0, row: 8, width: 3, height: 4 },
    };

    const result = computeAlignment(distribRects, 'distribute-v');
    // Sorted by row: a(0), c(8), b(20)
    // Total space: 24 - 0 = 24, total height = 12, gap space = 12
    // 2 gaps: 6 each
    expect(result.newPositions['a']!.row).toBe(0);
    expect(result.newPositions['c']!.row).toBe(10); // 0 + 4 + 6
    expect(result.newPositions['b']!.row).toBe(20); // 10 + 4 + 6
  });
});
