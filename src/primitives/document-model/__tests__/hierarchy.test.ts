import { describe, it, expect } from 'vitest';
import {
  flattenLayerOrder,
  isEffectivelyLocked,
  isEffectivelyHidden,
  getDepth,
} from '../hierarchy.ts';
import {
  createEmptyPage,
  addLayer,
  groupLayers,
  ungroupLayers,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  moveLayerToGroup,
  removeLayer,
} from '../operations.ts';
import type { FigmiiPage } from '../types.ts';

/** Helper: create a page with N layers (on top of the Background layer). */
function pageWithLayers(count: number): FigmiiPage {
  let page = createEmptyPage('Test');
  for (let i = 0; i < count; i++) {
    page = addLayer(page, 'border-box', `Layer ${i}`, { col: i * 5, row: 0, width: 4, height: 4 }, 'border', {
      borderStyle: 'rounded' as const,
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
    });
  }
  return page;
}

/** Get IDs of non-background layers in layerOrder order. */
function contentIds(page: FigmiiPage): string[] {
  return page.layerOrder.filter((id) => !page.layers[id]?.isBackground);
}

function bgId(page: FigmiiPage): string {
  return page.layerOrder.find((id) => page.layers[id]?.isBackground)!;
}

// ---------------------------------------------------------------------------
// flattenLayerOrder
// ---------------------------------------------------------------------------

describe('flattenLayerOrder', () => {
  it('returns root layers in order when no groups exist', () => {
    const page = pageWithLayers(3);
    const flat = flattenLayerOrder(page);
    expect(flat).toEqual(page.layerOrder);
  });

  it('expands group children inline', () => {
    let page = pageWithLayers(3);
    const [, b, c] = contentIds(page);
    page = groupLayers(page, [b!, c!], 'G1');
    const flat = flattenLayerOrder(page);
    // Background, Layer 0, Group (G1), Layer 1, Layer 2
    expect(flat).toHaveLength(5);
    expect(flat.indexOf(b!)).toBeGreaterThan(flat.indexOf(contentIds(page)[0]!));
  });

  it('handles nested groups', () => {
    let page = pageWithLayers(4);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[2]!, ids[3]!], 'Inner');
    // Now group 'Inner' + ids[1] into 'Outer'
    const innerGroupId = contentIds(page).find((id) => page.layers[id]?.kind === 'group')!;
    page = groupLayers(page, [ids[1]!, innerGroupId], 'Outer');
    const flat = flattenLayerOrder(page);
    // Background, Layer 0, Outer, Layer 1, Inner, Layer 2, Layer 3
    expect(flat).toHaveLength(7);
  });

  it('handles empty groups', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!]);
    const flat = flattenLayerOrder(page);
    // Background, Group, Layer 0, Layer 1
    expect(flat).toHaveLength(4);
    expect(flat[0]).toBe(bgId(page));
    expect(page.layers[flat[1]!]?.kind).toBe('group');
  });
});

// ---------------------------------------------------------------------------
// isEffectivelyLocked / isEffectivelyHidden
// ---------------------------------------------------------------------------

describe('isEffectivelyLocked', () => {
  it('returns false for an unlocked root layer', () => {
    const page = pageWithLayers(1);
    const id = contentIds(page)[0]!;
    expect(isEffectivelyLocked(page, id)).toBe(false);
  });

  it('returns true when the layer itself is locked', () => {
    let page = pageWithLayers(1);
    const id = contentIds(page)[0]!;
    page = { ...page, layers: { ...page.layers, [id]: { ...page.layers[id]!, locked: true } } };
    expect(isEffectivelyLocked(page, id)).toBe(true);
  });

  it('returns true when a parent group is locked', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!], 'G');
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = { ...page, layers: { ...page.layers, [groupId]: { ...page.layers[groupId]!, locked: true } } };
    expect(isEffectivelyLocked(page, ids[0]!)).toBe(true);
    expect(isEffectivelyLocked(page, ids[1]!)).toBe(true);
  });
});

describe('isEffectivelyHidden', () => {
  it('returns true when a parent group is hidden', () => {
    let page = pageWithLayers(1);
    const id = contentIds(page)[0]!;
    page = groupLayers(page, [id], 'G');
    const groupId = Object.keys(page.layers).find((gid) => page.layers[gid]?.kind === 'group' && !page.layers[gid]?.isBackground)!;
    page = { ...page, layers: { ...page.layers, [groupId]: { ...page.layers[groupId]!, visible: false } } };
    expect(isEffectivelyHidden(page, id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getDepth
// ---------------------------------------------------------------------------

describe('getDepth', () => {
  it('returns 0 for root-level layers', () => {
    const page = pageWithLayers(1);
    expect(getDepth(page, contentIds(page)[0]!)).toBe(0);
  });

  it('returns 1 for children of a root group', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!]);
    expect(getDepth(page, ids[0]!)).toBe(1);
  });

  it('returns 2 for doubly-nested layers', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!], 'Inner');
    const innerGroupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = groupLayers(page, [innerGroupId], 'Outer');
    expect(getDepth(page, ids[0]!)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// groupLayers / ungroupLayers
// ---------------------------------------------------------------------------

describe('groupLayers', () => {
  it('creates a group containing the specified layers', () => {
    let page = pageWithLayers(3);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!], 'G');
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    expect(page.layers[groupId]!.name).toBe('G');
    expect(page.layers[groupId]!.children).toEqual([ids[0]!, ids[1]!]);
    expect(page.layers[ids[0]!]!.parentId).toBe(groupId);
    expect(page.layers[ids[1]!]!.parentId).toBe(groupId);
    // Grouped layers removed from root layerOrder, group inserted
    expect(page.layerOrder).not.toContain(ids[0]!);
    expect(page.layerOrder).not.toContain(ids[1]!);
    expect(page.layerOrder).toContain(groupId);
  });

  it('computes bounding rect from children', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!]);
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    const rect = page.layers[groupId]!.rect;
    expect(rect.col).toBe(0);
    expect(rect.width).toBe(9); // 0..4 + 5..9
  });

  it('does nothing with empty array', () => {
    const page = pageWithLayers(1);
    expect(groupLayers(page, [])).toBe(page);
  });
});

describe('ungroupLayers', () => {
  it('dissolves a group and restores children to root', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!]);
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = ungroupLayers(page, groupId);
    expect(page.layers[groupId]).toBeUndefined();
    expect(page.layers[ids[0]!]!.parentId).toBeUndefined();
    expect(page.layerOrder).toContain(ids[0]!);
    expect(page.layerOrder).toContain(ids[1]!);
  });

  it('refuses to ungroup the Background layer', () => {
    const page = pageWithLayers(0);
    const bg = bgId(page);
    const result = ungroupLayers(page, bg);
    expect(result.layers[bg]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Z-order operations
// ---------------------------------------------------------------------------

describe('z-order', () => {
  it('bringForward swaps with the next sibling', () => {
    const page = pageWithLayers(3);
    const ids = contentIds(page);
    const result = bringForward(page, ids[0]!);
    const newIds = contentIds(result);
    expect(newIds[0]).toBe(ids[1]);
    expect(newIds[1]).toBe(ids[0]);
  });

  it('sendBackward swaps with the previous sibling', () => {
    const page = pageWithLayers(3);
    const ids = contentIds(page);
    const result = sendBackward(page, ids[2]!);
    const newIds = contentIds(result);
    expect(newIds[1]).toBe(ids[2]);
    expect(newIds[2]).toBe(ids[1]);
  });

  it('bringToFront moves to end', () => {
    const page = pageWithLayers(3);
    const ids = contentIds(page);
    const result = bringToFront(page, ids[0]!);
    const newIds = contentIds(result);
    expect(newIds[newIds.length - 1]).toBe(ids[0]);
  });

  it('sendToBack moves to just after Background', () => {
    const page = pageWithLayers(3);
    const ids = contentIds(page);
    const result = sendToBack(page, ids[2]!);
    // Background is at index 0 in layerOrder, so ids[2] goes to index 1
    expect(result.layerOrder[1]).toBe(ids[2]);
  });

  it('Background layer cannot be reordered', () => {
    const page = pageWithLayers(2);
    const bg = bgId(page);
    expect(bringForward(page, bg).layerOrder).toEqual(page.layerOrder);
    expect(sendBackward(page, bg).layerOrder).toEqual(page.layerOrder);
    expect(bringToFront(page, bg).layerOrder).toEqual(page.layerOrder);
    expect(sendToBack(page, bg).layerOrder).toEqual(page.layerOrder);
  });

  it('cannot sendBackward past Background', () => {
    const page = pageWithLayers(2);
    const ids = contentIds(page);
    // ids[0] is already the first content layer (right after Background)
    const result = sendBackward(page, ids[0]!);
    expect(contentIds(result)[0]).toBe(ids[0]);
  });
});

// ---------------------------------------------------------------------------
// moveLayerToGroup
// ---------------------------------------------------------------------------

describe('moveLayerToGroup', () => {
  it('moves a root layer into a group', () => {
    let page = pageWithLayers(3);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!], 'G');
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = moveLayerToGroup(page, ids[1]!, groupId);
    expect(page.layers[groupId]!.children).toContain(ids[1]!);
    expect(page.layers[ids[1]!]!.parentId).toBe(groupId);
    expect(page.layerOrder).not.toContain(ids[1]!);
  });

  it('moves a grouped layer to root', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!]);
    page = moveLayerToGroup(page, ids[0]!, null);
    expect(page.layers[ids[0]!]!.parentId).toBeUndefined();
    expect(page.layerOrder).toContain(ids[0]!);
  });

  it('prevents circular reparenting', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!], 'Inner');
    const innerGroupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = groupLayers(page, [innerGroupId], 'Outer');
    const outerGroupId = Object.keys(page.layers).find(
      (id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground && id !== innerGroupId,
    )!;
    // Try to move Outer into Inner — should be a no-op
    const result = moveLayerToGroup(page, outerGroupId, innerGroupId);
    expect(result.layers[outerGroupId]!.parentId).toBeUndefined();
  });

  it('cannot move Background', () => {
    const page = pageWithLayers(1);
    const bg = bgId(page);
    const result = moveLayerToGroup(page, bg, null, 99);
    expect(result.layerOrder[0]).toBe(bg);
  });
});

// ---------------------------------------------------------------------------
// removeLayer with hierarchy
// ---------------------------------------------------------------------------

describe('removeLayer (hierarchy)', () => {
  it('refuses to remove Background layer', () => {
    const page = pageWithLayers(0);
    const bg = bgId(page);
    const result = removeLayer(page, bg);
    expect(result.layers[bg]).toBeDefined();
  });

  it('removes a group and all its descendants', () => {
    let page = pageWithLayers(3);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!], 'G');
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = removeLayer(page, groupId);
    expect(page.layers[groupId]).toBeUndefined();
    expect(page.layers[ids[0]!]).toBeUndefined();
    expect(page.layers[ids[1]!]).toBeUndefined();
    expect(page.layers[ids[2]!]).toBeDefined();
  });

  it('removes from parent children when deleting a nested layer', () => {
    let page = pageWithLayers(2);
    const ids = contentIds(page);
    page = groupLayers(page, [ids[0]!, ids[1]!], 'G');
    const groupId = Object.keys(page.layers).find((id) => page.layers[id]?.kind === 'group' && !page.layers[id]?.isBackground)!;
    page = removeLayer(page, ids[0]!);
    expect(page.layers[groupId]!.children).not.toContain(ids[0]!);
    expect(page.layers[groupId]!.children).toContain(ids[1]!);
  });
});

// ---------------------------------------------------------------------------
// createEmptyPage
// ---------------------------------------------------------------------------

describe('createEmptyPage (Background)', () => {
  it('creates a page with a Background group layer', () => {
    const page = createEmptyPage('Test');
    expect(page.layerOrder).toHaveLength(1);
    const bg = page.layers[page.layerOrder[0]!]!;
    expect(bg.kind).toBe('group');
    expect(bg.name).toBe('Background');
    expect(bg.isBackground).toBe(true);
    expect(bg.children).toEqual([]);
  });
});
