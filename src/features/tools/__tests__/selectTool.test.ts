import { selectTool } from '@features/tools/selectTool.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties, TextBlockProperties } from '@primitives/document-model/types.ts';

function makePointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    shiftKey: false,
    button: 0,
    ...overrides,
  } as unknown as PointerEvent;
}

function makeMouseEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return {
    clientX: 0,
    clientY: 0,
    ...overrides,
  } as unknown as MouseEvent;
}

const boxProps: BorderBoxProperties = {
  borderStyle: 'rounded',
  padding: { top: 1, right: 1, bottom: 1, left: 1 },
};

beforeEach(() => {
  // Reset stores
  const docStore = useDocumentStore.getState();
  const freshDoc = docStore.document;
  const page = freshDoc.pages[0]!;

  // Add two layers
  let updatedPage = addLayer(
    page,
    'border-box',
    'Box A',
    { col: 5, row: 5, width: 10, height: 5 },
    'border',
    boxProps,
  );
  updatedPage = addLayer(
    updatedPage,
    'border-box',
    'Box B',
    { col: 8, row: 6, width: 10, height: 5 }, // overlaps with Box A
    'accentBorder',
    boxProps,
  );

  const updatedDoc = {
    ...freshDoc,
    pages: freshDoc.pages.map((p) => (p.id === freshDoc.activePageId ? updatedPage : p)),
  };

  useDocumentStore.setState({
    document: updatedDoc,
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedLayerIds: [],
    isDragging: false,
    dragStartPos: null,
    marqueeRect: null,
    editingLayerId: null,
  });
});

describe('selectTool', () => {
  it('has default cursor', () => {
    expect(selectTool.cursor).toBe('default');
  });

  describe('hit testing', () => {
    it('selects topmost layer at click position (reverse z-order)', () => {
      // Click at (9, 7) which is in both Box A and Box B overlap area
      // Box B is later in layerOrder, so should be selected
      selectTool.onPointerDown({ col: 9, row: 7 }, makePointerEvent());
      selectTool.onPointerUp({ col: 9, row: 7 }, makePointerEvent());

      const selected = useUiStore.getState().selectedLayerIds;
      expect(selected).toHaveLength(1);

      // Verify the selected layer is Box B (the one added second)
      const doc = useDocumentStore.getState().document;
      const page = doc.pages.find((p) => p.id === doc.activePageId)!;
      const selectedLayer = page.layers[selected[0]!];
      expect(selectedLayer?.name).toBe('Box B');
    });

    it('selects Box A when clicking in its non-overlapping area', () => {
      // Click at (5, 5) which is only in Box A
      selectTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
      selectTool.onPointerUp({ col: 5, row: 5 }, makePointerEvent());

      const selected = useUiStore.getState().selectedLayerIds;
      expect(selected).toHaveLength(1);

      const doc = useDocumentStore.getState().document;
      const page = doc.pages.find((p) => p.id === doc.activePageId)!;
      const selectedLayer = page.layers[selected[0]!];
      expect(selectedLayer?.name).toBe('Box A');
    });

    it('clears selection when clicking empty area', () => {
      // First select something
      selectTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
      selectTool.onPointerUp({ col: 5, row: 5 }, makePointerEvent());
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(1);

      // Click on empty area
      selectTool.onPointerDown({ col: 0, row: 0 }, makePointerEvent());
      selectTool.onPointerUp({ col: 0, row: 0 }, makePointerEvent());
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(0);
    });
  });

  describe('shift+click toggle', () => {
    it('adds to selection with shift+click', () => {
      // Select Box A
      selectTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
      selectTool.onPointerUp({ col: 5, row: 5 }, makePointerEvent());
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(1);

      // Shift+click Box B (at a non-overlapping position)
      selectTool.onPointerDown({ col: 17, row: 10 }, makePointerEvent({ shiftKey: true }));
      selectTool.onPointerUp({ col: 17, row: 10 }, makePointerEvent({ shiftKey: true }));
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(2);
    });

    it('removes from selection with shift+click on already selected', () => {
      // Select both layers
      selectTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent());
      selectTool.onPointerUp({ col: 5, row: 5 }, makePointerEvent());

      selectTool.onPointerDown({ col: 17, row: 10 }, makePointerEvent({ shiftKey: true }));
      selectTool.onPointerUp({ col: 17, row: 10 }, makePointerEvent({ shiftKey: true }));
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(2);

      // Shift+click Box A again to deselect it
      selectTool.onPointerDown({ col: 5, row: 5 }, makePointerEvent({ shiftKey: true }));
      selectTool.onPointerUp({ col: 5, row: 5 }, makePointerEvent({ shiftKey: true }));
      expect(useUiStore.getState().selectedLayerIds).toHaveLength(1);
    });
  });

  describe('double-click to edit', () => {
    const textProps: TextBlockProperties = {
      content: 'Hello',
      fontFamily: "'IBM Plex Mono', monospace",
      kerning: 1,
      lineSpacing: 0,
      alignment: 'left',
      styleKey: 'text',
    };

    function addTextBlock(col = 20, row = 20, locked = false) {
      const doc = useDocumentStore.getState().document;
      const page = doc.pages.find((p) => p.id === doc.activePageId)!;
      let updatedPage = addLayer(
        page,
        'text-block',
        'Text A',
        { col, row, width: 15, height: 5 },
        'text',
        textProps,
      );
      if (locked) {
        const layerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1]!;
        const layer = updatedPage.layers[layerId]!;
        updatedPage = {
          ...updatedPage,
          layers: { ...updatedPage.layers, [layerId]: { ...layer, locked: true } },
        };
      }
      useDocumentStore.setState({
        document: {
          ...doc,
          pages: doc.pages.map((p) => (p.id === doc.activePageId ? updatedPage : p)),
        },
      });
    }

    it('enters edit mode on double-click of text-block', () => {
      addTextBlock();
      selectTool.onDoubleClick!({ col: 22, row: 22 }, makeMouseEvent());
      expect(useUiStore.getState().editingLayerId).not.toBeNull();
    });

    it('does not enter edit mode on double-click of border-box', () => {
      // Box A at (5,5) is a border-box from beforeEach
      selectTool.onDoubleClick!({ col: 6, row: 6 }, makeMouseEvent());
      expect(useUiStore.getState().editingLayerId).toBeNull();
    });

    it('does not enter edit mode on double-click of locked text-block', () => {
      addTextBlock(40, 40, true);
      selectTool.onDoubleClick!({ col: 42, row: 42 }, makeMouseEvent());
      expect(useUiStore.getState().editingLayerId).toBeNull();
    });
  });
});
