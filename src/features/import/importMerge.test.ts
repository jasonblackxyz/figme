import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FIGMIIDocument, FIGMIIPage, Layer } from '@primitives/document-model/types.ts';
import { mergeImportedDocuments } from './importMerge.ts';

function makePage(id: string, name: string): FIGMIIPage {
  const page = createEmptyDocument(name).pages[0]!;
  return {
    ...page,
    id,
    name,
  };
}

function makeComponentDoc(pageName: string): FIGMIIDocument {
  const doc = createEmptyDocument(pageName);
  const sourceLayer: Layer = {
    id: 'layer-source',
    kind: 'divider',
    name: 'Source',
    rect: { col: 0, row: 0, width: 4, height: 1 },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'border',
    properties: {},
  };
  const componentLayer: Layer = {
    id: 'layer-instance',
    kind: 'component',
    name: 'Instance',
    rect: { col: 1, row: 1, width: 4, height: 2 },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'border',
    properties: { componentId: 'comp-shared' },
  };

  const page = {
    ...doc.pages[0]!,
    id: 'page-shared',
    name: pageName,
    layers: {
      [sourceLayer.id]: sourceLayer,
      [componentLayer.id]: componentLayer,
    },
    layerOrder: [sourceLayer.id, componentLayer.id],
  };

  return {
    ...doc,
    pages: [page],
    activePageId: page.id,
    components: {
      'comp-shared': {
        id: 'comp-shared',
        name: 'Component',
        description: 'Shared definition',
        sourceLayerIds: [sourceLayer.id],
      },
    },
  };
}

describe('mergeImportedDocuments', () => {
  it('appends every imported page and keeps the current document globals', () => {
    const current = createEmptyDocument('Current');
    const imported = createEmptyDocument('Imported');
    imported.pages = [
      makePage('page-a', 'Overview'),
      makePage('page-b', 'Specs'),
    ];
    imported.activePageId = 'page-a';

    current.pages = [makePage('page-current', 'Overview')];
    current.activePageId = 'page-current';

    const merged = mergeImportedDocuments(current, [imported]);

    expect(merged.pages.map((page) => page.name)).toEqual([
      'Overview',
      'Overview (2)',
      'Specs',
    ]);
    expect(merged.activePageId).toBe(merged.pages[1]!.id);
    expect(merged.gridConfig).toEqual(current.gridConfig);
    expect(merged.palette).toEqual(current.palette);
  });

  it('remaps duplicate page, component, and layer ids while keeping component references valid', () => {
    const current = createEmptyDocument('Current');
    const merged = mergeImportedDocuments(current, [
      makeComponentDoc('Library'),
      makeComponentDoc('Library'),
    ]);

    const importedPages = merged.pages.slice(1);
    expect(new Set(importedPages.map((page) => page.id)).size).toBe(importedPages.length);

    const componentIds = Object.keys(merged.components);
    expect(componentIds).toHaveLength(2);
    expect(new Set(componentIds).size).toBe(2);

    for (const page of importedPages) {
      const layerIds = Object.keys(page.layers);
      expect(new Set(layerIds).size).toBe(layerIds.length);

      const componentLayer = Object.values(page.layers).find((layer) => layer.kind === 'component');
      expect(componentLayer).toBeDefined();

      const componentId = (componentLayer!.properties as { componentId: string }).componentId;
      expect(merged.components[componentId]).toBeDefined();

      const sourceLayerId = merged.components[componentId]!.sourceLayerIds[0]!;
      expect(page.layers[sourceLayerId]).toBeDefined();
    }
  });
});
