import { exportAsGridSpec } from './exporter.ts';
import type { FigMeDocument, FigMePage, Layer } from '@primitives/document-model/types.ts';
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
