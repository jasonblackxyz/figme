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

    expect(imported.runtime?.annotations).toEqual(inferred.runtime?.annotations);
    expect(imported.pages[0]?.runtime).toEqual(inferred.pages[0]?.runtime);
    expect(html).toContain('data-runtime-semantics');
    expect(html).toContain('data-semantic-id="search-input"');
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
      }],
      runtime: {
        ...doc.runtime!,
        annotations: {
          graph: {
            id: 'graph',
            pageId: page.id,
            semanticId: 'graph-region',
            name: 'Graph <Region>',
            rect: { col: 2, row: 2, width: 20, height: 8 },
            export: true,
            role: 'custom',
            componentKind: 'custom-module',
            componentId: 'homepage.graph',
            customModuleKind: 'parent-doc-chip-graph',
            props: { label: 'A&B </script>' },
          },
        },
      },
    };

    const designPackage = buildDesignPackage(annotated);
    const screenNode = designPackage.screens[0]?.nodes[0];
    const component = designPackage.components.find((candidate) => candidate.id === 'homepage.graph');
    const gridConfig = applyPageCanvasSizeToGridConfig(annotated.pages[0]!, annotated.gridConfig);
    const buffer = composePageBuffer(annotated.pages[0]!, gridConfig);
    const html = exportAsHtml(annotated, buffer, gridConfig);
    const runtimeText = html.match(/<script type="application\/json" data-runtime-semantics>([\s\S]*?)<\/script>/)?.[1] ?? '';

    expect(screenNode?.componentId).toBe('homepage.graph');
    expect(component).toMatchObject({
      id: 'homepage.graph',
      kind: 'custom-module',
      moduleKind: 'parent-doc-chip-graph',
    });
    expect(JSON.parse(runtimeText).annotations[0].props.label).toBe('A&B </script>');
  });
});
