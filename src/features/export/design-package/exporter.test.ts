import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { FigmiiDocument, FigmiiPage } from '@primitives/document-model/types.ts';
import {
  DesignPackageExportError,
  TIER1_COMPONENT_KINDS,
  buildDesignPackage,
  buildDesignPackageExport,
  validateDesignPackage,
  type RuntimeComponentKind,
  type SemanticRegion,
} from './index.ts';

function withPageRuntime(doc: FigmiiDocument, runtime: NonNullable<FigmiiPage['runtime']>): FigmiiDocument {
  const page = doc.pages[0]!;
  return {
    ...doc,
    pages: [{ ...page, runtime: { ...page.runtime, ...runtime } }],
  };
}

function withRegions(doc: FigmiiDocument, regions: SemanticRegion[], regionOrder = regions.map((region) => region.id)): FigmiiDocument {
  const page = doc.pages[0]!;
  return {
    ...doc,
    pages: [{
      ...page,
      regions: Object.fromEntries(regions.map((region) => [region.id, region])),
      regionOrder,
    }],
  };
}

function region(kind: RuntimeComponentKind, index = 0, overrides: Partial<SemanticRegion> = {}): SemanticRegion {
  const semanticId = overrides.semanticId ?? `${kind}-${index}`;
  return {
    id: overrides.id ?? `region-${semanticId}`,
    semanticId,
    componentKind: kind,
    shape: overrides.shape ?? {
      rect: {
        col: 2 + (index % 4) * 12,
        row: 2 + Math.floor(index / 4) * 4,
        width: 10,
        height: kind === 'divider' || kind === 'spacer' || kind === 'icon' ? 1 : 3,
      },
    },
    props: kind === 'custom-module' ? { moduleKind: 'summary-graph' } : undefined,
    bindings: kind === 'text-input' || kind === 'textarea'
      ? [{ slot: 'value', path: `${semanticId}.value`, fallback: '' }]
      : undefined,
    interactions: kind === 'text-input'
      ? [{ id: `${semanticId}.submit`, action: { kind: 'submitQuery', target: semanticId } }]
      : undefined,
    ...overrides,
  };
}

describe('design-package exporter', () => {
  it('reports an empty document as non-exportable without throwing in relaxed mode', () => {
    const doc = createEmptyDocument('Empty');
    const result = buildDesignPackageExport(doc);

    expect(result.package.schemaVersion).toBe('readme-design-package-v1');
    expect(result.package.screens).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MISSING_SCREEN_ID' }),
      expect.objectContaining({ code: 'MISSING_BREAKPOINTS' }),
    ]));
  });

  it('exports one region for every Tier 1 kind and cross-validates the package', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Tier 1'), { screenId: 'tier-1' }),
      TIER1_COMPONENT_KINDS.map((kind, index) => region(kind, index)),
    );

    const result = buildDesignPackageExport(doc);
    const validation = validateDesignPackage(result.package);
    const componentKinds = new Set(result.package.components.map((component) => component.kind));

    expect(result.package.screens[0]?.nodes).toHaveLength(TIER1_COMPONENT_KINDS.length);
    for (const kind of TIER1_COMPONENT_KINDS) {
      expect(componentKinds.has(kind)).toBe(true);
    }
    expect([...result.diagnostics, ...validation.diagnostics].filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('sorts overlapping regions by z order', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Overlap'), { screenId: 'overlap' }),
      [
        region('card', 0, { id: 'front-card', semanticId: 'front-card', z: 10, shape: { rect: { col: 2, row: 2, width: 12, height: 5 } } }),
        region('button', 1, { id: 'back-button', semanticId: 'back-button', z: 1, shape: { rect: { col: 4, row: 3, width: 8, height: 3 } } }),
      ],
      ['front-card', 'back-button'],
    );

    const nodes = buildDesignPackage(doc).screens[0]?.nodes;

    expect(nodes?.map((node) => node.id)).toEqual(['back-button', 'front-card']);
  });

  it('round-trips excluded region cells onto the node', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Exclude'), { screenId: 'exclude' }),
      [
        region('card', 0, {
          id: 'l-card',
          semanticId: 'l-card',
          shape: {
            rect: { col: 2, row: 2, width: 6, height: 4 },
            exclude: [{ col: 2, row: 2 }, { col: 3, row: 2 }],
          },
        }),
      ],
    );

    const node = buildDesignPackage(doc).screens[0]?.nodes[0];

    expect(node?.exclude).toEqual([{ col: 2, row: 2 }, { col: 3, row: 2 }]);
    expect(validateDesignPackage(buildDesignPackage(doc)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('keeps Tier 2 regions valid with a reserved-kind warning', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Tier 2'), { screenId: 'tier-2' }),
      [region('toggle', 0, { bindings: [{ slot: 'checked', path: 'filters.enabled', fallback: false }] })],
    );

    const result = buildDesignPackageExport(doc);

    expect(result.package.components[0]?.kind).toBe('toggle');
    expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'RESERVED_COMPONENT_KIND', severity: 'warning' }),
    ]));
  });

  it('throws in strict mode when a selected page is missing a screen id', () => {
    const doc = withRegions(createEmptyDocument('Strict'), [region('button')]);

    expect(() => buildDesignPackageExport(doc, { strict: true })).toThrow(DesignPackageExportError);
  });

  it('falls back to the selected screen when the authored default is excluded', () => {
    const firstDoc = withRegions(
      withPageRuntime(createEmptyDocument('Subset'), { screenId: 'screen-a' }),
      [region('button', 0, { id: 'button-a', semanticId: 'button-a' })],
    );
    const secondDoc = withRegions(
      withPageRuntime(createEmptyDocument('Subset Page 2'), { screenId: 'screen-b' }),
      [region('button', 1, { id: 'button-b', semanticId: 'button-b' })],
    );
    const secondPage = { ...secondDoc.pages[0]!, id: 'page-b', name: 'Page B' };
    const doc: FigmiiDocument = {
      ...firstDoc,
      runtime: {
        ...firstDoc.runtime!,
        manifest: { ...firstDoc.runtime!.manifest, defaultScreen: 'screen-a' },
      },
      pages: [
        { ...firstDoc.pages[0]!, id: 'page-a', name: 'Page A' },
        secondPage,
      ],
    };

    const result = buildDesignPackageExport(doc, { selectedPageIds: ['page-b'], strict: true });

    expect(result.package.screens.map((screen) => screen.id)).toEqual(['screen-b']);
    expect(result.package.manifest.defaultScreen).toBe('screen-b');
  });

  it('normalizes self-targeted interactions to the exported node id', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Targets'), { screenId: 'targets' }),
      [
        region('text-input', 0, {
          id: 'Search_Input',
          semanticId: 'Search Input',
          interactions: [{ id: 'focusSearch', action: { kind: 'focusInput', target: 'Search Input' } }],
        }),
      ],
    );

    const pkg = buildDesignPackage(doc);

    expect(pkg.screens[0]?.nodes[0]?.id).toBe('search-input');
    expect(pkg.interactions?.focussearch?.action).toMatchObject({
      kind: 'focusInput',
      target: 'search-input',
    });
  });

  it('treats input regions without value bindings as strict export errors', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Missing Binding'), { screenId: 'missing-binding' }),
      [region('text-input', 0, { bindings: [] })],
    );
    const relaxed = buildDesignPackageExport(doc);
    const validation = validateDesignPackage(relaxed.package);

    expect(relaxed.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INPUT_WITHOUT_VALUE_BINDING', severity: 'error' }),
    ]));
    expect(validation.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'TEXT_INPUT_MISSING_VALUE_BINDING', severity: 'error' }),
    ]));
    expect(() => buildDesignPackageExport(doc, { strict: true })).toThrow(DesignPackageExportError);
  });

  it('emits render oracle only when requested and respects oracle-only regions', () => {
    const doc = withRegions(
      withPageRuntime(createEmptyDocument('Oracle'), { screenId: 'oracle' }),
      [
        region('card', 0, { exportMode: 'oracle-only' }),
        region('button', 1),
      ],
    );

    const withoutOracle = buildDesignPackage(doc);
    const withOracle = buildDesignPackage(doc, { includeRenderOracle: true });

    expect(withoutOracle.renderOracle).toBeUndefined();
    expect(withoutOracle.screens[0]?.nodes.map((node) => node.id)).toEqual(['button-1']);
    const oracle = withOracle.renderOracle?.oracle;
    expect(oracle).toBeDefined();
    expect(oracle!.chars.length).toBeGreaterThan(0);
  });
});
