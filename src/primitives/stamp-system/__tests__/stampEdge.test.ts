import { stampEdge } from '../stampEdge.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

describe('stampEdge', () => {
  it('draws a horizontal line between two horizontally aligned rects', () => {
    const source: GridRect = { col: 0, row: 5, width: 4, height: 4 };
    const target: GridRect = { col: 20, row: 5, width: 4, height: 4 };
    // Centers: source=(2,7), target=(22,7) — same row
    const buffer = stampEdge(source, target, 'edge', 30, 15);

    expect(buffer.width).toBe(30);
    expect(buffer.height).toBe(15);

    // Should draw horizontal line at row 7 from col 2 to col 22
    expect(buffer.chars[7]![2]).toBe('─');
    expect(buffer.chars[7]![10]).toBe('─');
    expect(buffer.chars[7]![22]).toBe('─');
    expect(buffer.styles[7]![2]).toBe('edge');
  });

  it('draws a vertical line between two vertically aligned rects', () => {
    const source: GridRect = { col: 10, row: 0, width: 4, height: 4 };
    const target: GridRect = { col: 10, row: 20, width: 4, height: 4 };
    // Centers: source=(12,2), target=(12,22)
    const buffer = stampEdge(source, target, 'border', 20, 25);

    expect(buffer.chars[2]![12]).toBe('│');
    expect(buffer.chars[10]![12]).toBe('│');
    expect(buffer.chars[22]![12]).toBe('│');
    expect(buffer.styles[2]![12]).toBe('border');
  });

  it('draws L-shaped path with correct corner for right-down', () => {
    const source: GridRect = { col: 0, row: 0, width: 4, height: 4 };
    const target: GridRect = { col: 20, row: 20, width: 4, height: 4 };
    // Centers: source=(2,2), target=(22,22)
    // L-shape: horizontal from (2,2) to (22,2), then vertical from (22,2) to (22,22)
    const buffer = stampEdge(source, target, 'edge', 30, 30);

    // Horizontal segment at row 2
    expect(buffer.chars[2]![5]).toBe('─');

    // Corner at (22, 2) should be ┐
    expect(buffer.chars[2]![22]).toBe('┐');

    // Vertical segment at col 22
    expect(buffer.chars[10]![22]).toBe('│');
    expect(buffer.chars[22]![22]).toBe('│');
  });

  it('draws L-shaped path with correct corner for left-up', () => {
    const source: GridRect = { col: 20, row: 20, width: 4, height: 4 };
    const target: GridRect = { col: 0, row: 0, width: 4, height: 4 };
    // Centers: source=(22,22), target=(2,2)
    // L-shape: horizontal from (22,22) to (2,22), then vertical from (2,22) to (2,2)
    // Corner at (2,22)
    const buffer = stampEdge(source, target, 'edge', 30, 30);

    // Corner should be └ (going left then up)
    expect(buffer.chars[22]![2]).toBe('└');
  });

  it('returns empty buffer for zero canvas dimensions', () => {
    const source: GridRect = { col: 0, row: 0, width: 4, height: 4 };
    const target: GridRect = { col: 10, row: 10, width: 4, height: 4 };
    const buffer = stampEdge(source, target, 'edge', 0, 0);
    expect(buffer.width).toBe(0);
    expect(buffer.height).toBe(0);
  });

  it('handles same-position source and target', () => {
    const source: GridRect = { col: 5, row: 5, width: 4, height: 4 };
    const target: GridRect = { col: 5, row: 5, width: 4, height: 4 };
    const buffer = stampEdge(source, target, 'edge', 20, 20);
    // Centers are the same (7,7) — should draw a single point
    expect(buffer.chars[7]![7]).toBe('·');
  });

  it('applies style key to all path characters', () => {
    const source: GridRect = { col: 0, row: 5, width: 4, height: 4 };
    const target: GridRect = { col: 10, row: 5, width: 4, height: 4 };
    const buffer = stampEdge(source, target, 'accentBorder', 20, 15);

    // Check that non-bg styles are accentBorder
    for (let c = 2; c <= 12; c++) {
      expect(buffer.styles[7]![c]).toBe('accentBorder');
    }
  });
});
