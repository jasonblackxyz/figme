import { computeAutoLayout } from '../autoLayout.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { AutoLayoutConfig } from '@primitives/document-model/types.ts';

describe('computeAutoLayout', () => {
  const parentRect: GridRect = { col: 0, row: 0, width: 40, height: 30 };

  it('returns empty result for no children', () => {
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 1,
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
      alignment: 'start',
      sizing: 'fixed',
    };
    const result = computeAutoLayout(parentRect, config, {});
    expect(Object.keys(result.childRects)).toHaveLength(0);
    expect(result.overflow).toBe(false);
  });

  it('stacks children vertically with gap', () => {
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 2,
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
      alignment: 'start',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 10, height: 4 },
      b: { col: 0, row: 0, width: 8, height: 3 },
      c: { col: 0, row: 0, width: 12, height: 5 },
    };

    const result = computeAutoLayout(parentRect, config, children);

    // All should be at padding.left = 1 for start alignment
    expect(result.childRects['a']!.col).toBe(1);
    expect(result.childRects['b']!.col).toBe(1);
    expect(result.childRects['c']!.col).toBe(1);

    // Stacked: first at padding.top = 1, then +height+gap
    expect(result.childRects['a']!.row).toBe(1);
    expect(result.childRects['b']!.row).toBe(7); // 1 + 4 + 2
    expect(result.childRects['c']!.row).toBe(12); // 7 + 3 + 2
  });

  it('stacks children horizontally with gap', () => {
    const config: AutoLayoutConfig = {
      direction: 'horizontal',
      gap: 1,
      padding: { top: 2, right: 2, bottom: 2, left: 2 },
      alignment: 'start',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 5, height: 3 },
      b: { col: 0, row: 0, width: 7, height: 4 },
    };

    const result = computeAutoLayout(parentRect, config, children);

    expect(result.childRects['a']!.col).toBe(2); // padding.left
    expect(result.childRects['b']!.col).toBe(8); // 2 + 5 + 1

    expect(result.childRects['a']!.row).toBe(2); // padding.top
    expect(result.childRects['b']!.row).toBe(2);
  });

  it('applies center cross-axis alignment', () => {
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 1,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      alignment: 'center',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 10, height: 3 },
      b: { col: 0, row: 0, width: 6, height: 3 },
    };

    const result = computeAutoLayout(parentRect, config, children);
    // Content width = 40, center a: (40-10)/2 = 15
    expect(result.childRects['a']!.col).toBe(15);
    // center b: (40-6)/2 = 17
    expect(result.childRects['b']!.col).toBe(17);
  });

  it('applies end cross-axis alignment', () => {
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 1,
      padding: { top: 0, right: 2, bottom: 0, left: 2 },
      alignment: 'end',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 10, height: 3 },
    };

    const result = computeAutoLayout(parentRect, config, children);
    // Content width = 40 - 2 - 2 = 36
    // end alignment: padding.left + contentWidth - rectWidth = 2 + 36 - 10 = 28
    expect(result.childRects['a']!.col).toBe(28);
  });

  it('hug-contents sizing computes minimal parent rect', () => {
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 1,
      padding: { top: 2, right: 3, bottom: 2, left: 3 },
      alignment: 'start',
      sizing: 'hug-contents',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 10, height: 4 },
      b: { col: 0, row: 0, width: 8, height: 3 },
    };

    const result = computeAutoLayout(parentRect, config, children);

    // Max width of children = 10
    // Expected parent width: 10 + 3 + 3 = 16
    expect(result.parentRect.width).toBe(16);

    // Total height: 4 + 1 + 3 = 8
    // Expected parent height: 8 + 2 + 2 = 12
    expect(result.parentRect.height).toBe(12);

    expect(result.overflow).toBe(false);
  });

  it('detects overflow in fixed sizing', () => {
    const smallParent: GridRect = { col: 0, row: 0, width: 10, height: 5 };
    const config: AutoLayoutConfig = {
      direction: 'vertical',
      gap: 1,
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
      alignment: 'start',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 0, row: 0, width: 5, height: 4 },
      b: { col: 0, row: 0, width: 5, height: 4 },
    };

    const result = computeAutoLayout(smallParent, config, children);
    // Content area height = 5 - 1 - 1 = 3
    // Children total = 4 + 1 + 4 = 9 > 3
    expect(result.overflow).toBe(true);
    expect(result.parentRect).toBe(smallParent); // Not resized
  });

  it('preserves child dimensions', () => {
    const config: AutoLayoutConfig = {
      direction: 'horizontal',
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      alignment: 'start',
      sizing: 'fixed',
    };
    const children: Record<string, GridRect> = {
      a: { col: 5, row: 10, width: 7, height: 3 },
    };

    const result = computeAutoLayout(parentRect, config, children);
    expect(result.childRects['a']!.width).toBe(7);
    expect(result.childRects['a']!.height).toBe(3);
  });
});
