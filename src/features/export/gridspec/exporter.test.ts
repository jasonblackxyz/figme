import { exportAsGridSpec } from './exporter.ts';
import type { FigMeDocument, FigMePage, Layer } from '@primitives/document-model/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

function makeBorderLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: 'layer-border',
    kind: 'border-box',
    name: 'Shared Name',
    rect: { col: 1, row: 1, width: 8, height: 4 },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'border',
    properties: {
      borderStyle: 'rounded',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    ...overrides,
  };
}

describe('exportAsGridSpec', () => {
  it('preserves stable ids and resolves component definitions by componentId', () => {
    const base = createEmptyDocument('GridSpec Review');
    const page: FigMePage = {
      ...base.pages[0]!,
      id: 'page-main',
      name: 'Main',
    };

    const childLayer = makeBorderLayer({
      id: 'layer-child',
      parentId: 'layer-parent',
    });

    const componentLayer: Layer = {
      id: 'layer-component',
      kind: 'component',
      name: 'Shared Name',
      rect: { col: 10, row: 2, width: 6, height: 3 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'accentText',
      properties: {
        componentId: 'comp-1',
      },
    };

    const parentLayer = makeBorderLayer({
      id: 'layer-parent',
      children: ['layer-child', 'layer-component'],
    });

    page.layers = {
      [parentLayer.id]: parentLayer,
      [childLayer.id]: childLayer,
      [componentLayer.id]: componentLayer,
    };
    page.layerOrder = [parentLayer.id, childLayer.id, componentLayer.id];

    const doc: FigMeDocument = {
      ...base,
      id: 'doc-1',
      pages: [page],
      activePageId: page.id,
      components: {
        'comp-1': {
          id: 'comp-1',
          name: 'Button',
          description: 'Reusable call-to-action',
          sourceLayerIds: [childLayer.id],
        },
      },
      metadata: {
        ...base.metadata,
        version: 7,
      },
    };

    const result = exportAsGridSpec(doc);

    expect(result.document).toMatchObject({
      id: 'doc-1',
      name: 'GridSpec Review',
      version: 7,
    });

    expect(result.pages[0]).toMatchObject({
      id: 'page-main',
      name: 'Main',
    });

    expect(result.components[0]).toMatchObject({
      id: 'comp-1',
      sourceLayerIds: ['layer-child'],
      sourceLayerNames: ['Shared Name'],
    });

    const exportedParent = result.pages[0]!.layers[0]!;
    expect(exportedParent).toMatchObject({
      id: 'layer-parent',
      childIds: ['layer-child', 'layer-component'],
      childNames: ['Shared Name', 'Shared Name'],
    });

    const exportedChild = result.pages[0]!.layers[1]!;
    expect(exportedChild).toMatchObject({
      id: 'layer-child',
      parentId: 'layer-parent',
      parentName: 'Shared Name',
    });

    const exportedComponent = result.pages[0]!.layers[2]!;
    expect(exportedComponent.resolved.componentDef).toMatchObject({
      id: 'comp-1',
      name: 'Button',
      sourceLayerIds: ['layer-child'],
      sourceLayerNames: ['Shared Name'],
    });
  });
});

const smallGrid: GridConfig = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  lineHeight: 1.35,
  cellWidth: 8.4,
  cellHeight: 18.9,
  canvasCols: 10,
  canvasRows: 5,
};

describe('exportAsGridSpec with includeBuffer', () => {
  it('produces compact buffer with chars, colorPalette, and colorMap', () => {
    const doc = createEmptyDocument('Buffer Test', smallGrid);
    const result = exportAsGridSpec(doc, { includeBuffer: true });
    const page = result.pages[0]!;

    expect(page.buffer).toBeDefined();
    const buf = page.buffer!;

    // chars: one string per row, each row has 10 cols
    expect(buf.chars).toHaveLength(5);
    for (const row of buf.chars) {
      expect(typeof row).toBe('string');
      expect(row).toHaveLength(10);
    }

    // colorMap: 5 rows x 10 cols of integer indices
    expect(buf.colorMap).toHaveLength(5);
    for (const row of buf.colorMap) {
      expect(row).toHaveLength(10);
      for (const idx of row) {
        expect(typeof idx).toBe('number');
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(buf.colorPalette.length);
      }
    }

    // colorPalette: at least one entry with color and bg
    expect(buf.colorPalette.length).toBeGreaterThan(0);
    for (const entry of buf.colorPalette) {
      expect(typeof entry.color).toBe('string');
      expect(typeof entry.bg).toBe('string');
    }

    // no colorOverrides on the page
    expect((page as Record<string, unknown>)['colorOverrides']).toBeUndefined();
  });

  it('deduplicates colors into a compact palette', () => {
    const doc = createEmptyDocument('Dedup Test', smallGrid);
    const result = exportAsGridSpec(doc, { includeBuffer: true });
    const buf = result.pages[0]!.buffer!;

    // Empty grid: all cells share the same style ('bg'), so palette should have 1 entry
    expect(buf.colorPalette).toHaveLength(1);
    // All cells map to index 0
    for (const row of buf.colorMap) {
      for (const idx of row) {
        expect(idx).toBe(0);
      }
    }
  });

  it('produces distinct palette entries for layers with different styles', () => {
    const doc = createEmptyDocument('Multi-style', smallGrid);
    const page = doc.pages[0]!;

    const borderLayer: Layer = {
      id: 'layer-box',
      kind: 'border-box',
      name: 'Box',
      rect: { col: 1, row: 1, width: 6, height: 3 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'border',
      properties: {
        borderStyle: 'rounded',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    };
    page.layers[borderLayer.id] = borderLayer;
    page.layerOrder.push(borderLayer.id);

    const result = exportAsGridSpec(doc, { includeBuffer: true });
    const buf = result.pages[0]!.buffer!;

    // Should have multiple palette entries: bg cells, border cells, nodeBg fill cells
    expect(buf.colorPalette.length).toBeGreaterThan(1);
  });

  it('preserves fontWeight in palette entries', () => {
    const doc = createEmptyDocument('FontWeight Test', smallGrid);
    const page = doc.pages[0]!;

    // Use a text-block with modalTitle style (has fontWeight: 700)
    const textLayer: Layer = {
      id: 'layer-title',
      kind: 'text-block',
      name: 'Title',
      rect: { col: 0, row: 0, width: 5, height: 1 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'modalTitle',
      properties: {
        content: 'Hello',
        fontFamily: "'IBM Plex Mono', monospace",
        kerning: 0,
        lineSpacing: 0,
        alignment: 'left',
        styleKey: 'modalTitle',
        renderMode: 'literal',
      },
    };
    page.layers[textLayer.id] = textLayer;
    page.layerOrder.push(textLayer.id);

    const result = exportAsGridSpec(doc, { includeBuffer: true });
    const buf = result.pages[0]!.buffer!;

    // Find the palette entry for the modalTitle cells (has fontWeight)
    const boldEntry = buf.colorPalette.find((e) => e.fontWeight === 700);
    expect(boldEntry).toBeDefined();
    expect(boldEntry!.fontWeight).toBe(700);

    // Non-bold entries should not have fontWeight
    const nonBold = buf.colorPalette.filter((e) => !e.fontWeight);
    expect(nonBold.length).toBeGreaterThan(0);
  });

  it('bakes color overrides into resolved palette', () => {
    const doc = createEmptyDocument('Override Test', smallGrid);
    const page = doc.pages[0]!;

    // Add page-level cell color overrides for a few cells
    page.cellColorOverrides = {
      '0,0': '#ff0000',
      '0,1': '#ff0000',
      '0,2': '#00ff00',
    };

    const result = exportAsGridSpec(doc, { includeBuffer: true });
    const buf = result.pages[0]!.buffer!;

    // Should have palette entries that include the override colors as bg
    const hasRed = buf.colorPalette.some((e) => e.bg === '#ff0000');
    const hasGreen = buf.colorPalette.some((e) => e.bg === '#00ff00');
    expect(hasRed).toBe(true);
    expect(hasGreen).toBe(true);

    // Cells (0,0) and (0,1) should share the same palette index (same override)
    expect(buf.colorMap[0]![0]).toBe(buf.colorMap[0]![1]);
    // Cell (0,2) should have a different index
    expect(buf.colorMap[0]![2]).not.toBe(buf.colorMap[0]![0]);
  });
});
