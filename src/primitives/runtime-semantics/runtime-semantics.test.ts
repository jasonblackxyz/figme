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

  it('migrates legacy runtime annotations into page regions', () => {
    const doc = createEmptyDocument('Legacy Annotations');
    const page = doc.pages[0]!;
    const legacy: FigMeDocument = {
      ...doc,
      pages: [{
        ...page,
        runtime: { ...page.runtime, screenId: 'search', exportAsScreen: true },
      }],
      runtime: {
        ...doc.runtime,
        bindings: {
          queryValue: { id: 'queryValue', path: 'search.query', fallback: '' },
        },
        interactions: {
          submitSearch: { id: 'submitSearch', action: { kind: 'submitQuery', target: 'search-input' } },
        },
        annotations: {
          search: {
            id: 'search',
            pageId: page.id,
            semanticId: 'search-input',
            rect: { col: 2, row: 2, width: 24, height: 3 },
            export: true,
            role: 'input',
            componentKind: 'text-input',
            bindingSlots: { value: 'queryValue' },
            interactionIds: ['submitSearch'],
          },
        },
      },
    } as FigMeDocument;

    const migrated = deserializeDocument(JSON.stringify(legacy));
    const region = migrated.pages[0]?.regions?.search;

    expect(region).toMatchObject({
      semanticId: 'search-input',
      componentKind: 'text-input',
      shape: { rect: { col: 2, row: 2, width: 24, height: 3 } },
      bindings: [{ slot: 'value', path: 'search.query', fallback: '' }],
      interactions: [{ id: 'submitSearch', action: { kind: 'submitQuery', target: 'search-input' } }],
    });
    expect('annotations' in (migrated.runtime as object)).toBe(false);
  });

  it('migrates legacy layer runtime into regions and strips layer runtime', () => {
    const doc = createEmptyDocument('Legacy Layer Runtime');
    const layer = {
      ...borderLayer('legacy-input', 'Legacy Input', 2),
      runtime: {
        semanticId: 'legacy-input',
        role: 'input',
        componentKind: 'text-input',
        bindingSlots: { value: 'search.query' },
      },
    } as Layer & { runtime: unknown };
    const legacy = addLayer(doc, layer);

    const migrated = deserializeDocument(JSON.stringify(legacy));
    const region = Object.values(migrated.pages[0]?.regions ?? {}).find((candidate) => candidate.semanticId === 'legacy-input');
    const migratedLayer = migrated.pages[0]?.layers['legacy-input'] as Layer & { runtime?: unknown };

    expect(region).toMatchObject({
      semanticId: 'legacy-input',
      componentKind: 'text-input',
      bindings: [{ slot: 'value', path: 'search.query' }],
    });
    expect(migratedLayer.runtime).toBeUndefined();
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
    expect(designPackage.components.some((component) => component.kind === 'text-input')).toBe(true);
    expect(designPackage.screens[0]?.nodes.some((node) => node.id === 'search-input')).toBe(true);
    expect(designPackage.renderOracle?.['page-1']?.chars.length).toBeGreaterThan(0);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('reports invalid navigation routes', () => {
    let doc = createEmptyDocument('Bad Route');
    doc = addLayer(doc, borderLayer('reader-button', 'Reader Button', 2, 3));
    const inferred = inferRuntimeSemantics(doc).document;
    const page = inferred.pages[0]!;
    const region = Object.values(page.regions ?? {})[0]!;

    const withBadRoute: FigMeDocument = {
      ...inferred,
      pages: [{
        ...page,
        regions: {
          ...page.regions,
          [region.id]: {
            ...region,
            interactions: [{ id: 'openMissing', action: { kind: 'navigate', route: 'missing' } }],
          },
        },
      }],
    };

    expect(validateRuntimeSemantics(withBadRoute)).toContainEqual(expect.objectContaining({
      code: 'INVALID_NAVIGATION_ROUTE',
    }));
  });

});
