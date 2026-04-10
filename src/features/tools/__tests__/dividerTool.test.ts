import { dividerTool, computeDividerRect } from '../dividerTool.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

function makePointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    shiftKey: false,
    button: 0,
    ...overrides,
  } as unknown as PointerEvent;
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument(),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedLayerIds: [],
    hoveredLayerId: null,
    isDragging: false,
    dragStartPos: null,
    marqueeRect: null,
    drawingPreview: null,
    editingLayerId: null,
  });
});

describe('computeDividerRect', () => {
  it('creates horizontal divider when dx >= dy', () => {
    const rect = computeDividerRect({ col: 2, row: 5 }, { col: 12, row: 5 });
    expect(rect).toEqual({ col: 2, row: 5, width: 11, height: 1 });
  });

  it('creates vertical divider when dy > dx', () => {
    const rect = computeDividerRect({ col: 5, row: 2 }, { col: 5, row: 12 });
    expect(rect).toEqual({ col: 5, row: 2, width: 1, height: 11 });
  });

  it('creates horizontal divider when dx equals dy', () => {
    const rect = computeDividerRect({ col: 0, row: 0 }, { col: 5, row: 5 });
    // dx === dy, so isHorizontal is true
    expect(rect.height).toBe(1);
    expect(rect.width).toBe(6);
  });

  it('enforces minimum width of 2 for horizontal divider', () => {
    const rect = computeDividerRect({ col: 5, row: 5 }, { col: 5, row: 5 });
    // dx=0, dy=0, isHorizontal=true
    expect(rect.width).toBeGreaterThanOrEqual(2);
    expect(rect.height).toBe(1);
  });

  it('enforces minimum height of 2 for vertical divider', () => {
    const rect = computeDividerRect({ col: 5, row: 5 }, { col: 5, row: 6 });
    // dx=0, dy=1, isHorizontal=false (dx < dy)
    expect(rect.width).toBe(1);
    expect(rect.height).toBeGreaterThanOrEqual(2);
  });

  it('handles reverse horizontal drag', () => {
    const rect = computeDividerRect({ col: 10, row: 5 }, { col: 2, row: 5 });
    expect(rect).toEqual({ col: 2, row: 5, width: 9, height: 1 });
  });

  it('handles reverse vertical drag', () => {
    const rect = computeDividerRect({ col: 5, row: 10 }, { col: 5, row: 2 });
    expect(rect).toEqual({ col: 5, row: 2, width: 1, height: 9 });
  });
});

describe('dividerTool', () => {
  it('has crosshair cursor', () => {
    expect(dividerTool.cursor).toBe('crosshair');
  });

  it('sets isDragging on pointer down', () => {
    dividerTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
    expect(useUiStore.getState().isDragging).toBe(true);
  });

  it('sets drawing preview on pointer move', () => {
    dividerTool.onPointerDown({ col: 2, row: 5 }, makePointerEvent());
    dividerTool.onPointerMove({ col: 12, row: 5 }, makePointerEvent());

    const preview = useUiStore.getState().drawingPreview;
    expect(preview).not.toBeNull();
    expect(preview!.kind).toBe('divider');
    expect(preview!.rect.height).toBe(1);
  });

  it('creates a divider layer on pointer up', () => {
    dividerTool.onPointerDown({ col: 2, row: 5 }, makePointerEvent());
    dividerTool.onPointerUp({ col: 12, row: 5 }, makePointerEvent());

    const doc = useDocumentStore.getState().document;
    const page = doc.pages.find(p => p.id === doc.activePageId)!;
    expect(page.layerOrder).toHaveLength(2);

    const layerId = page.layerOrder[page.layerOrder.length - 1]!;
    const layer = page.layers[layerId]!;
    expect(layer.kind).toBe('divider');
    expect(layer.name).toBe('Divider');
  });

  it('selects the newly created layer', () => {
    dividerTool.onPointerDown({ col: 2, row: 5 }, makePointerEvent());
    dividerTool.onPointerUp({ col: 12, row: 5 }, makePointerEvent());

    const selected = useUiStore.getState().selectedLayerIds;
    expect(selected).toHaveLength(1);
  });

  it('clears drawing state on pointer up', () => {
    dividerTool.onPointerDown({ col: 2, row: 5 }, makePointerEvent());
    dividerTool.onPointerUp({ col: 12, row: 5 }, makePointerEvent());

    expect(useUiStore.getState().isDragging).toBe(false);
    expect(useUiStore.getState().drawingPreview).toBeNull();
  });
});
