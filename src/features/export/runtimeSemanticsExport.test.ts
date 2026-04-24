import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigMeDocument, Layer } from '@primitives/document-model/types.ts';
import { applyPageCanvasSizeToGridConfig } from '@primitives/document-model/canvasSize.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { inferRuntimeSemantics } from '@primitives/runtime-semantics/inference.ts';
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
});
