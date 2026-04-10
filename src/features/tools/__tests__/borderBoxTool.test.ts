import { borderBoxTool, computeRect } from '../borderBoxTool.ts';
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

describe('computeRect', () => {
  it('computes rect from top-left to bottom-right drag', () => {
    const rect = computeRect({ col: 2, row: 3 }, { col: 10, row: 8 });
    expect(rect).toEqual({ col: 2, row: 3, width: 9, height: 6 });
  });

  it('computes rect from bottom-right to top-left drag', () => {
    const rect = computeRect({ col: 10, row: 8 }, { col: 2, row: 3 });
    expect(rect).toEqual({ col: 2, row: 3, width: 9, height: 6 });
  });

  it('enforces minimum 2x2 size', () => {
    const rect = computeRect({ col: 5, row: 5 }, { col: 5, row: 5 });
    expect(rect.width).toBeGreaterThanOrEqual(2);
    expect(rect.height).toBeGreaterThanOrEqual(2);
  });

  it('enforces minimum width of 2', () => {
    const rect = computeRect({ col: 5, row: 5 }, { col: 5, row: 10 });
    expect(rect.width).toBe(2);
    expect(rect.height).toBe(6);
  });

  it('enforces minimum height of 2', () => {
    const rect = computeRect({ col: 5, row: 5 }, { col: 10, row: 5 });
    expect(rect.width).toBe(6);
    expect(rect.height).toBe(2);
  });
});

describe('borderBoxTool', () => {
  it('has crosshair cursor', () => {
    expect(borderBoxTool.cursor).toBe('crosshair');
  });

  it('sets isDragging on pointer down', () => {
    borderBoxTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
    expect(useUiStore.getState().isDragging).toBe(true);
    expect(useUiStore.getState().dragStartPos).toEqual({ col: 5, row: 5 });
  });

  it('sets drawing preview on pointer move', () => {
    borderBoxTool.onPointerDown({ col: 2, row: 3 }, makePointerEvent());
    borderBoxTool.onPointerMove({ col: 10, row: 8 }, makePointerEvent());

    const preview = useUiStore.getState().drawingPreview;
    expect(preview).not.toBeNull();
    expect(preview!.kind).toBe('border-box');
    expect(preview!.rect).toEqual({ col: 2, row: 3, width: 9, height: 6 });
  });

  it('creates a layer on pointer up', () => {
    borderBoxTool.onPointerDown({ col: 2, row: 3 }, makePointerEvent());
    borderBoxTool.onPointerUp({ col: 10, row: 8 }, makePointerEvent());

    const doc = useDocumentStore.getState().document;
    const page = doc.pages.find(p => p.id === doc.activePageId)!;
    expect(page.layerOrder).toHaveLength(2);

    const layerId = page.layerOrder[page.layerOrder.length - 1]!;
    const layer = page.layers[layerId]!;
    expect(layer.kind).toBe('border-box');
    expect(layer.name).toBe('Border Box');
    expect(layer.rect).toEqual({ col: 2, row: 3, width: 9, height: 6 });
  });

  it('selects the newly created layer', () => {
    borderBoxTool.onPointerDown({ col: 2, row: 3 }, makePointerEvent());
    borderBoxTool.onPointerUp({ col: 10, row: 8 }, makePointerEvent());

    const selected = useUiStore.getState().selectedLayerIds;
    expect(selected).toHaveLength(1);
  });

  it('clears drawing state on pointer up', () => {
    borderBoxTool.onPointerDown({ col: 2, row: 3 }, makePointerEvent());
    borderBoxTool.onPointerUp({ col: 10, row: 8 }, makePointerEvent());

    expect(useUiStore.getState().isDragging).toBe(false);
    expect(useUiStore.getState().drawingPreview).toBeNull();
    expect(useUiStore.getState().dragStartPos).toBeNull();
  });

  it('pushes undo before creating layer', () => {
    borderBoxTool.onPointerDown({ col: 2, row: 3 }, makePointerEvent());
    borderBoxTool.onPointerUp({ col: 10, row: 8 }, makePointerEvent());

    expect(useDocumentStore.getState().undoStack).toHaveLength(1);
  });
});
