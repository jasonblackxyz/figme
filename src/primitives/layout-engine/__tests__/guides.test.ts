import { computeGuides } from '../guides.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

describe('computeGuides', () => {
  it('returns empty guides when there are no other rects', () => {
    const dragging: GridRect = { col: 5, row: 5, width: 10, height: 4 };
    const result = computeGuides(dragging, []);
    expect(result.guides).toEqual([]);
    expect(result.snapSuggestion).toBeUndefined();
  });

  it('detects left-edge alignment', () => {
    const dragging: GridRect = { col: 10, row: 5, width: 6, height: 4 };
    const other: GridRect = { col: 10, row: 15, width: 8, height: 3 };
    const result = computeGuides(dragging, [other]);

    const leftGuides = result.guides.filter(
      (g) => g.orientation === 'vertical' && g.position === 10 && g.kind === 'edge',
    );
    expect(leftGuides.length).toBeGreaterThan(0);
  });

  it('detects right-edge alignment', () => {
    const dragging: GridRect = { col: 5, row: 5, width: 10, height: 4 };
    const other: GridRect = { col: 7, row: 15, width: 8, height: 3 };
    // dragging right = 15, other right = 15
    const result = computeGuides(dragging, [other]);

    const rightGuides = result.guides.filter(
      (g) => g.orientation === 'vertical' && g.position === 15,
    );
    expect(rightGuides.length).toBeGreaterThan(0);
  });

  it('detects top-edge alignment', () => {
    const dragging: GridRect = { col: 5, row: 10, width: 6, height: 4 };
    const other: GridRect = { col: 20, row: 10, width: 8, height: 3 };
    const result = computeGuides(dragging, [other]);

    const topGuides = result.guides.filter(
      (g) => g.orientation === 'horizontal' && g.position === 10 && g.kind === 'edge',
    );
    expect(topGuides.length).toBeGreaterThan(0);
  });

  it('detects center-to-center alignment', () => {
    // Both centered at col 10
    const dragging: GridRect = { col: 7, row: 5, width: 6, height: 4 };
    const other: GridRect = { col: 6, row: 15, width: 8, height: 3 };
    // dragging centerH = 7 + 3 = 10, other centerH = 6 + 4 = 10
    const result = computeGuides(dragging, [other]);

    const centerGuides = result.guides.filter(
      (g) => g.orientation === 'vertical' && g.position === 10 && g.kind === 'center',
    );
    expect(centerGuides.length).toBeGreaterThan(0);
  });

  it('respects snap threshold', () => {
    const dragging: GridRect = { col: 11, row: 5, width: 6, height: 4 };
    const other: GridRect = { col: 10, row: 15, width: 8, height: 3 };

    // With default threshold of 1, should detect alignment (diff = 1)
    const result1 = computeGuides(dragging, [other], 1);
    expect(result1.guides.length).toBeGreaterThan(0);

    // With threshold of 0, should not detect (diff = 1)
    const result0 = computeGuides(dragging, [other], 0);
    const leftEdgeGuides = result0.guides.filter(
      (g) => g.orientation === 'vertical' && g.position === 10 && g.kind === 'edge',
    );
    expect(leftEdgeGuides.length).toBe(0);
  });

  it('provides a snap suggestion when guides are found', () => {
    // dragging: col=11, width=5. Edges: left=11, right=16, centerH=13
    // other:    col=10, width=7. Edges: left=10, right=17, centerH=13
    // Matches: left-left delta=1, center-center delta=0 (exact)
    // Best snap is center-center (delta=0) => snapCol = 13 - floor(5/2) = 11
    // Since the center already perfectly aligns, snap keeps col=11
    const dragging: GridRect = { col: 11, row: 5, width: 5, height: 4 };
    const other: GridRect = { col: 10, row: 15, width: 7, height: 3 };

    const result = computeGuides(dragging, [other], 1);
    expect(result.snapSuggestion).toBeDefined();
    // Center-center is the best match (delta=0), which keeps col=11
    expect(result.snapSuggestion!.col).toBe(11);
  });

  it('detects equal-spacing patterns', () => {
    // Three rects equally spaced horizontally with gap of 5
    const other1: GridRect = { col: 0, row: 0, width: 5, height: 3 };
    const other2: GridRect = { col: 10, row: 0, width: 5, height: 3 };
    // Gap between other1 and other2 = 10 - 5 = 5
    // Place dragging so gap from dragging right to other1 left = 5
    // dragging right = dragging.col + 5 = 0 - 5 = -5 => dragging at col -10 width 5 => right = -5
    // Actually let's place dragging to the right of other2
    // other2 right = 15, dragging left = 20, gap = 5
    const dragging: GridRect = { col: 20, row: 0, width: 5, height: 3 };

    const result = computeGuides(dragging, [other1, other2], 1);
    const spacingGuides = result.guides.filter((g) => g.kind === 'spacing');
    expect(spacingGuides.length).toBeGreaterThan(0);
  });
});
