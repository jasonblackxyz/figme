import { computeResizedRect, HANDLES } from '../resizeHandles.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

const BASE: GridRect = { col: 5, row: 10, width: 8, height: 6 };

describe('computeResizedRect', () => {
  it('se: extends bottom-right', () => {
    expect(computeResizedRect(BASE, 'se', 3, 2)).toEqual({
      col: 5, row: 10, width: 11, height: 8,
    });
  });

  it('nw: moves top-left', () => {
    expect(computeResizedRect(BASE, 'nw', 2, 1)).toEqual({
      col: 7, row: 11, width: 6, height: 5,
    });
  });

  it('e: extends right edge only', () => {
    const result = computeResizedRect(BASE, 'e', 4, 99);
    expect(result).toEqual({ col: 5, row: 10, width: 12, height: 6 });
  });

  it('n: moves top edge only', () => {
    const result = computeResizedRect(BASE, 'n', 99, -3);
    expect(result).toEqual({ col: 5, row: 7, width: 8, height: 9 });
  });

  it('w: moves left edge', () => {
    const result = computeResizedRect(BASE, 'w', -2, 99);
    expect(result).toEqual({ col: 3, row: 10, width: 10, height: 6 });
  });

  it('s: extends bottom edge only', () => {
    const result = computeResizedRect(BASE, 's', 99, 5);
    expect(result).toEqual({ col: 5, row: 10, width: 8, height: 11 });
  });

  it('ne: moves top, extends right', () => {
    expect(computeResizedRect(BASE, 'ne', 2, -1)).toEqual({
      col: 5, row: 9, width: 10, height: 7,
    });
  });

  it('sw: moves left, extends bottom', () => {
    expect(computeResizedRect(BASE, 'sw', -3, 2)).toEqual({
      col: 2, row: 10, width: 11, height: 8,
    });
  });

  it('clamps minimum width to 1', () => {
    const result = computeResizedRect(BASE, 'e', -20, 0);
    expect(result.width).toBe(1);
  });

  it('clamps minimum height to 1', () => {
    const result = computeResizedRect(BASE, 's', 0, -20);
    expect(result.height).toBe(1);
  });

  it('nw clamp: cannot shrink past 1x1', () => {
    const result = computeResizedRect(BASE, 'nw', 20, 20);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.col).toBe(BASE.col + BASE.width - 1);
    expect(result.row).toBe(BASE.row + BASE.height - 1);
  });

  it('HANDLES has exactly 8 entries', () => {
    expect(HANDLES).toHaveLength(8);
  });
});
