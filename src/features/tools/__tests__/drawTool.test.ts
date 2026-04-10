import { drawTool } from '@features/tools/drawTool.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer, createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties } from '@primitives/document-model/types.ts';

function makePointerEvent(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    clientX: 0,
    clientY: 0,
    shiftKey: false,
    button: 0,
    ...overrides,
  } as unknown as PointerEvent;
}

const boxProps: BorderBoxProperties = {
  borderStyle: 'rounded',
  padding: { top: 1, right: 1, bottom: 1, left: 1 },
};

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument(),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    activeColor: '#123456',
    brushSize: 1,
    eraserMode: false,
  });
  drawTool.onPointerUp({ col: 0, row: 0 }, makePointerEvent());
});

describe('drawTool', () => {
  it('routes each brush cell to the correct target at layer edges', () => {
    const doc = useDocumentStore.getState().document;
    const page = doc.pages[0]!;
    const updatedPage = addLayer(
      page,
      'border-box',
      'Edge Box',
      { col: 10, row: 10, width: 2, height: 2 },
      'border',
      boxProps,
    );
    const layerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1]!;

    useDocumentStore.setState({
      document: {
        ...doc,
        pages: [updatedPage],
      },
    });
    useUiStore.setState({ brushSize: 3 });

    drawTool.onPointerDown({ col: 10, row: 10 }, makePointerEvent());
    drawTool.onPointerUp({ col: 10, row: 10 }, makePointerEvent());

    const nextDoc = useDocumentStore.getState().document;
    const nextPage = nextDoc.pages[0]!;
    expect(nextPage.cellColorOverrides).toEqual({
      '9,9': '#123456',
      '9,10': '#123456',
      '9,11': '#123456',
      '10,9': '#123456',
      '11,9': '#123456',
    });
    expect(nextPage.layers[layerId]!.cellColorOverrides).toEqual({
      '0,0': '#123456',
      '0,1': '#123456',
      '1,0': '#123456',
      '1,1': '#123456',
    });
  });

  it('records a single undo step for one drag stroke', () => {
    drawTool.onPointerDown({ col: 0, row: 0 }, makePointerEvent());
    drawTool.onPointerMove({ col: 1, row: 0 }, makePointerEvent());
    drawTool.onPointerMove({ col: 2, row: 0 }, makePointerEvent());
    drawTool.onPointerUp({ col: 2, row: 0 }, makePointerEvent());

    const afterStroke = useDocumentStore.getState();
    expect(afterStroke.undoStack).toHaveLength(1);
    expect(afterStroke.document.pages[0]!.cellColorOverrides).toEqual({
      '0,0': '#123456',
      '0,1': '#123456',
      '0,2': '#123456',
    });

    afterStroke.undo();
    expect(useDocumentStore.getState().document.pages[0]!.cellColorOverrides).toBeUndefined();
  });
});
