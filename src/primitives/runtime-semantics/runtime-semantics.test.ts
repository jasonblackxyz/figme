import { deserializeDocument } from '@primitives/document-model/serialization.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigMeDocument, Layer } from '@primitives/document-model/types.ts';
import { inferRuntimeSemantics } from './inference.ts';
import { buildDesignPackage } from './exporter.ts';
import { validateRuntimeSemantics } from './validator.ts';

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

function borderLayer(id: string, name: string, row: number, height = 3): Layer {
  return {
    id,
    kind: 'border-box',
    name,
    rect: { col: 2, row, width: 28, height },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey: 'border',
    properties: {
      borderStyle: 'rounded',
      padding: { top: 1, right: 1, bottom: 1, left: 1 },
    },
  };
}

describe('runtime semantics', () => {
  it('migrates older documents without runtime metadata', () => {
    const doc = createEmptyDocument('Legacy');
    const legacy = {
      ...doc,
      runtime: undefined,
      pages: doc.pages.map((page) => ({ ...page, runtime: undefined })),
    };

    const migrated = deserializeDocument(JSON.stringify(legacy));

    expect(migrated.runtime).toBeDefined();
    expect(migrated.pages[0]?.runtime).toMatchObject({
      exportAsScreen: false,
      desktopBehavior: 'centered-mobile-canvas',
    });
  });

  it('infers screen annotations and exports a valid design package', () => {
    let doc = createEmptyDocument('Starter Circuit');
    doc = addLayer(doc, borderLayer('summary-panel', 'Summary Panel', 2, 7));
    doc = addLayer(doc, borderLayer('search-shell', 'Search Input', 11, 3));

    const inferred = inferRuntimeSemantics(doc).document;
    const designPackage = buildDesignPackage(inferred, { includeRenderOracle: true });
    const diagnostics = validateRuntimeSemantics(inferred);

    expect(designPackage.schemaVersion).toBe('readme-design-package-v1');
    expect(designPackage.manifest.defaultScreen).toBe('page-1');
    expect(designPackage.components.some((component) => component.id === 'query.input')).toBe(true);
    expect(designPackage.screens[0]?.nodes.some((node) => node.id === 'search-input')).toBe(true);
    expect(designPackage.renderOracle?.['page-1']?.chars.length).toBeGreaterThan(0);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('reports invalid navigation routes', () => {
    let doc = createEmptyDocument('Bad Route');
    doc = addLayer(doc, borderLayer('reader-button', 'Reader Button', 2, 3));
    const inferred = inferRuntimeSemantics(doc).document;
    const runtime = inferred.runtime!;
    const annotation = Object.values(runtime.annotations)[0]!;

    const withBadRoute: FigMeDocument = {
      ...inferred,
      runtime: {
        ...runtime,
        interactions: {
          ...runtime.interactions,
          openMissing: { id: 'openMissing', action: { kind: 'navigate', route: 'missing' } },
        },
        annotations: {
          ...runtime.annotations,
          [annotation.id]: { ...annotation, interactionIds: ['openMissing'] },
        },
      },
    };

    expect(validateRuntimeSemantics(withBadRoute)).toContainEqual(expect.objectContaining({
      code: 'INVALID_NAVIGATION_ROUTE',
    }));
  });

});
