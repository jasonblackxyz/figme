import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigMeDocument, Layer } from '@primitives/document-model/types.ts';
import { applyPageCanvasSizeToGridConfig } from '@primitives/document-model/canvasSize.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { inferRuntimeSemantics } from '@primitives/runtime-semantics/inference.ts';
import { buildDesignPackage } from '@primitives/runtime-semantics/exporter.ts';
import { exportAsHtml } from './exporters.ts';
import { exportAsGridSpec } from './gridspec/exporter.ts';
import { importGridSpec } from '@features/import/importGridSpec.ts';

function addLayer(doc: FigMeDocument, layer: Layer): FigMeDocument {
  const page = doc.pages[0]!;
  return {
    ...doc,
    pages: [{
      ...page,
      layers: { ...page.layers, [layer.id]: layer },
      layerOrder: [...page.layerOrder, layer.id],
    }],
  };
}

describe('runtime semantic exports', () => {
  it('round-trips runtime metadata through GridSpec and adds semantic HTML attributes', () => {
    let doc = createEmptyDocument('Round Trip');
    doc = addLayer(doc, {
      id: 'search-shell',
      kind: 'border-box',
      name: 'Search Input',
      rect: { col: 2, row: 2, width: 24, height: 3 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'border',
      properties: {
        borderStyle: 'rounded',
        padding: { top: 1, right: 1, bottom: 1, left: 1 },
      },
    });
    const inferred = inferRuntimeSemantics(doc).document;
    const gridSpec = exportAsGridSpec(inferred, { includeBuffer: true });
    const imported = importGridSpec(JSON.stringify(gridSpec));
    const activePage = inferred.pages[0]!;
    const gridConfig = applyPageCanvasSizeToGridConfig(activePage, inferred.gridConfig);
    const buffer = composePageBuffer(activePage, gridConfig);
    const html = exportAsHtml(inferred, buffer, gridConfig);

    expect(imported.pages[0]?.regions).toEqual(inferred.pages[0]?.regions);
    expect(imported.pages[0]?.runtime).toEqual(inferred.pages[0]?.runtime);
    expect(html).toContain('data-runtime-semantics');
    expect(html).toContain('data-semantic-id="search-input"');
  });

  it('imports legacy GridSpec layer runtime as canonical regions', () => {
    let doc = createEmptyDocument('Legacy GridSpec');
    doc = addLayer(doc, {
      id: 'legacy-layer',
      kind: 'border-box',
      name: 'Legacy Search',
      rect: { col: 3, row: 4, width: 20, height: 3 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'border',
      properties: {
        borderStyle: 'rounded',
        padding: { top: 1, right: 1, bottom: 1, left: 1 },
      },
    });
    const gridSpec = exportAsGridSpec(doc);
    gridSpec.pages[0]!.layers.find((layer) => layer.id === 'legacy-layer')!.runtime = {
      semanticId: 'legacy-search',
      role: 'input',
      componentKind: 'text-input',
      bindingSlots: { value: 'search.query' },
    };

    const imported = importGridSpec(JSON.stringify(gridSpec));
    const region = Object.values(imported.pages[0]?.regions ?? {}).find((candidate) => candidate.semanticId === 'legacy-search');

    expect(region).toMatchObject({
      componentKind: 'text-input',
      shape: { rect: { col: 3, row: 4, width: 20, height: 3 } },
      bindings: [{ slot: 'value', path: 'search.query' }],
    });
    expect(imported.pages[0]?.layers['legacy-layer']).not.toHaveProperty('runtime');
  });

  it('preserves custom module ids and embeds parseable runtime JSON in HTML', () => {
    const doc = createEmptyDocument('Custom Runtime');
    const page = doc.pages[0]!;
    const annotated: FigMeDocument = {
      ...doc,
      pages: [{
        ...page,
        runtime: {
          ...page.runtime,
          screenId: 'home',
          exportAsScreen: true,
        },
        regions: {
          graph: {
            id: 'graph',
            semanticId: 'graph-region',
            shape: { rect: { col: 2, row: 2, width: 20, height: 8 } },
            role: 'container',
            componentKind: 'custom-module',
            props: { moduleKind: 'parent-doc-chip-graph', label: 'A&B </script>' },
          },
        },
        regionOrder: ['graph'],
      }],
    };

    const designPackage = buildDesignPackage(annotated);
    const screenNode = designPackage.screens[0]?.nodes[0];
    const component = designPackage.components.find((candidate) => candidate.id === 'custom.parent-doc-chip-graph');
    const gridConfig = applyPageCanvasSizeToGridConfig(annotated.pages[0]!, annotated.gridConfig);
    const buffer = composePageBuffer(annotated.pages[0]!, gridConfig);
    const html = exportAsHtml(annotated, buffer, gridConfig);
    const runtimeText = html.match(/<script type="application\/json" data-runtime-semantics>([\s\S]*?)<\/script>/)?.[1] ?? '';

    expect(screenNode?.componentId).toBe('custom.parent-doc-chip-graph');
    expect(component).toMatchObject({
      id: 'custom.parent-doc-chip-graph',
      kind: 'custom-module',
      moduleKind: 'parent-doc-chip-graph',
    });
    expect(JSON.parse(runtimeText).regions[0].props.label).toBe('A&B </script>');
  });
});
