import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { buildApi } from '../agentApi.ts';

let api: ReturnType<typeof buildApi>;

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test Doc'),
    undoStack: [],
    redoStack: [],
  });
  // Region tests rely on border-box layers; those are blocked in AI mode.
  useUiStore.setState({ interfaceMode: 'human' });
  api = buildApi();
});

describe('FIGMII.regions CRUD', () => {
  it('defines a region from an explicit rect', () => {
    const id = api.regions.defineRegion({
      rect: { col: 2, row: 3, width: 10, height: 4 },
      componentKind: 'frame',
      semanticId: 'main',
    });
    expect(id).toMatch(/^region_/);
    const region = api.regions.getRegion(id);
    expect(region?.componentKind).toBe('frame');
    expect(region?.shape.rect).toEqual({ col: 2, row: 3, width: 10, height: 4 });
    expect(region?.semanticId).toBe('main');
    expect(region?.provenance?.source).toBe('ai');
  });

  it('lists regions in insertion order', () => {
    api.regions.defineRegion({ rect: { col: 0, row: 0, width: 4, height: 4 }, componentKind: 'frame' });
    api.regions.defineRegion({ rect: { col: 5, row: 0, width: 4, height: 4 }, componentKind: 'card' });
    const list = api.regions.listRegions();
    expect(list.map((r) => r.componentKind)).toEqual(['frame', 'card']);
  });

  it('updates a region', () => {
    const id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 4, height: 4 },
      componentKind: 'frame',
    });
    api.regions.updateRegion(id, { componentKind: 'card', semanticId: 'card1' });
    const region = api.regions.getRegion(id);
    expect(region?.componentKind).toBe('card');
    expect(region?.semanticId).toBe('card1');
  });

  it('removes a region', () => {
    const id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 4, height: 4 },
      componentKind: 'frame',
    });
    api.regions.removeRegion(id);
    expect(api.regions.getRegion(id)).toBeUndefined();
    expect(api.regions.listRegions()).toHaveLength(0);
  });

  it('refuses to update a missing region', () => {
    expect(() => api.regions.updateRegion('nope', { componentKind: 'card' })).toThrow();
  });
});

describe('FIGMII.regions shape mutation', () => {
  it('addCellsToRegion grows the shape', () => {
    const id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 2, height: 2 },
      componentKind: 'frame',
    });
    api.regions.addCellsToRegion(id, [{ col: 5, row: 5 }]);
    const region = api.regions.getRegion(id)!;
    expect(region.shape.rect).toEqual({ col: 0, row: 0, width: 6, height: 6 });
    // The original 2x2 + the new cell = 5 included; remaining = 36-5 = 31 excluded
    expect(region.shape.exclude?.length).toBe(31);
  });

  it('removeCellsFromRegion shrinks shape and removes when empty', () => {
    const id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 2, height: 1 },
      componentKind: 'frame',
    });
    api.regions.removeCellsFromRegion(id, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
    expect(api.regions.getRegion(id)).toBeUndefined();
  });

  it('setRegionShape replaces shape wholesale', () => {
    const id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 2, height: 2 },
      componentKind: 'frame',
    });
    api.regions.setRegionShape(id, {
      rect: { col: 10, row: 10, width: 5, height: 5 },
      exclude: [{ col: 12, row: 12 }],
    });
    const region = api.regions.getRegion(id)!;
    expect(region.shape.rect).toEqual({ col: 10, row: 10, width: 5, height: 5 });
    expect(region.shape.exclude).toEqual([{ col: 12, row: 12 }]);
  });
});

describe('FIGMII.regions binding & interaction methods', () => {
  let id: string;

  beforeEach(() => {
    id = api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 4, height: 2 },
      componentKind: 'text-input',
    });
  });

  it('addBinding upserts by slot', () => {
    api.regions.addBinding(id, { slot: 'value', path: 'search.query' });
    api.regions.addBinding(id, { slot: 'value', path: 'replace.path' });
    const region = api.regions.getRegion(id)!;
    expect(region.bindings).toEqual([{ slot: 'value', path: 'replace.path' }]);
  });

  it('removeBinding clears the slot', () => {
    api.regions.addBinding(id, { slot: 'value', path: 'q' });
    api.regions.removeBinding(id, 'value');
    expect(api.regions.getRegion(id)?.bindings).toBeUndefined();
  });

  it('addInteraction upserts by id', () => {
    api.regions.addInteraction(id, { id: 'submit', action: { kind: 'submitQuery' } });
    api.regions.addInteraction(id, { id: 'submit', action: { kind: 'navigate', route: '/' } });
    const region = api.regions.getRegion(id)!;
    expect(region.interactions).toHaveLength(1);
    expect(region.interactions?.[0]?.action.kind).toBe('navigate');
  });
});

describe('FIGMII.regions mark helpers', () => {
  it('markInput sets value binding and optional submit', () => {
    const id = api.regions.markInput(
      { rect: { col: 0, row: 0, width: 30, height: 3 } },
      {
        semanticId: 'search',
        valuePath: 'search.query',
        placeholder: 'Search…',
        submitInteractionId: 'submitQuery',
      },
    );
    const region = api.regions.getRegion(id)!;
    expect(region.componentKind).toBe('text-input');
    expect(region.role).toBe('input');
    expect(region.bindings).toEqual([{ slot: 'value', path: 'search.query' }]);
    expect(region.interactions).toEqual([
      { id: 'submitQuery', action: { kind: 'submitQuery' } },
    ]);
    expect(region.props).toEqual({ placeholder: 'Search…' });
  });

  it('markButton uses provided action', () => {
    const id = api.regions.markButton(
      { rect: { col: 0, row: 0, width: 6, height: 1 } },
      { semanticId: 'go', action: { kind: 'navigate', route: '/dashboard' } },
    );
    const region = api.regions.getRegion(id)!;
    expect(region.componentKind).toBe('button');
    expect(region.role).toBe('button');
    expect(region.interactions?.[0]?.action).toEqual({ kind: 'navigate', route: '/dashboard' });
  });

  it('markDecoration sets exportMode ignore by default', () => {
    const id = api.regions.markDecoration({
      rect: { col: 0, row: 0, width: 4, height: 1 },
    });
    const region = api.regions.getRegion(id)!;
    expect(region.exportMode).toBe('ignore');
    expect(region.role).toBe('decoration');
  });

  it('markCustomModule writes moduleKind into props', () => {
    const id = api.regions.markCustomModule(
      { rect: { col: 0, row: 0, width: 8, height: 2 } },
      { semanticId: 'graph', moduleKind: 'parent-doc-chip-graph', props: { foo: 'bar' } },
    );
    const region = api.regions.getRegion(id)!;
    expect(region.componentKind).toBe('custom-module');
    expect(region.props).toEqual({ foo: 'bar', moduleKind: 'parent-doc-chip-graph' });
  });

  it('mark helpers accept layerId regionInput', () => {
    const layerId = api.addLayer({
      kind: 'border-box',
      col: 1,
      row: 1,
      width: 20,
      height: 3,
    });
    const id = api.regions.markInput(
      { layerId: layerId! },
      { semanticId: 'search', valuePath: 'search.query' },
    );
    const region = api.regions.getRegion(id)!;
    expect(region.shape.rect).toEqual({ col: 1, row: 1, width: 20, height: 3 });
  });

  it('mark helpers accept layerIds regionInput producing union rect', () => {
    api.batch(() => {
      api.addLayer({ kind: 'border-box', col: 0, row: 0, width: 4, height: 4, name: 'L1' });
      api.addLayer({ kind: 'border-box', col: 6, row: 1, width: 3, height: 2, name: 'L2' });
    });
    const layers = api.findLayers({});
    const userLayers = layers.filter((l) => l.name === 'L1' || l.name === 'L2');
    const id = api.regions.defineRegion({
      layerIds: userLayers.map((l) => l.id),
      componentKind: 'frame',
    });
    const region = api.regions.getRegion(id)!;
    expect(region.shape.rect).toEqual({ col: 0, row: 0, width: 9, height: 4 });
  });
});

describe('FIGMII.regions bulk authoring', () => {
  it('defineRegionsBatch creates all in one undo entry', () => {
    const undoBefore = useDocumentStore.getState().undoStack.length;
    const ids = api.regions.defineRegionsBatch([
      { rect: { col: 0, row: 0, width: 4, height: 4 }, componentKind: 'frame' },
      { rect: { col: 4, row: 0, width: 4, height: 4 }, componentKind: 'card' },
      { rect: { col: 8, row: 0, width: 4, height: 4 }, componentKind: 'button' },
    ]);
    expect(ids).toHaveLength(3);
    expect(api.regions.listRegions()).toHaveLength(3);
    const undoAfter = useDocumentStore.getState().undoStack.length;
    expect(undoAfter).toBe(undoBefore + 1);
  });

  it('labelByLayerBounds uses single layer bounds', () => {
    const layerId = api.addLayer({
      kind: 'border-box',
      col: 5,
      row: 5,
      width: 10,
      height: 4,
    });
    const id = api.regions.labelByLayerBounds({
      layerId: layerId!,
      componentKind: 'card',
      semanticId: 'card1',
    });
    const region = api.regions.getRegion(id)!;
    expect(region.shape.rect).toEqual({ col: 5, row: 5, width: 10, height: 4 });
    expect(region.componentKind).toBe('card');
  });
});

describe('FIGMII.regions runtime / page metadata', () => {
  it('setPageRuntime + getPageRuntime round-trip', () => {
    const pageId = api.getDocument().activePageId;
    api.regions.setPageRuntime(pageId, {
      screenId: 'home',
      exportAsScreen: true,
      desktopBehavior: 'centered-mobile-canvas',
    });
    expect(api.regions.getPageRuntime()).toEqual(
      expect.objectContaining({
        screenId: 'home',
        exportAsScreen: true,
        desktopBehavior: 'centered-mobile-canvas',
      }),
    );
  });

  it('setDocumentRuntime + getDocumentRuntime round-trip', () => {
    api.regions.setDocumentRuntime({
      designFamily: 'starter',
      packageVersion: '0.2.0',
      sourceRefs: ['github://x/y'],
    });
    expect(api.regions.getDocumentRuntime()).toEqual({
      designFamily: 'starter',
      packageVersion: '0.2.0',
      sourceRefs: ['github://x/y'],
    });
  });
});

describe('FIGMII.regions validation', () => {
  it('returns diagnostics keyed to region id', () => {
    api.regions.defineRegion({
      rect: { col: 0, row: 0, width: 10, height: 3 },
      componentKind: 'text-input',
    });
    const diagnostics = api.regions.validateRegions();
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]?.message).toMatch(/^region_/);
    expect(diagnostics.some((d) => d.code === 'INPUT_WITHOUT_VALUE_BINDING')).toBe(true);
  });
});
