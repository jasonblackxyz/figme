import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextEditor } from '@features/text-editor/TextEditor.tsx';
import { addLayer, createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { TextBlockProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';

function setupEditingTextBlock() {
  const doc = createEmptyDocument('Text Editor Test');
  const activePageId = doc.activePageId;
  const page = doc.pages.find((entry) => entry.id === activePageId)!;
  const props: TextBlockProperties = {
    content: 'Hello world',
    fontFamily: "'IBM Plex Mono', monospace",
    kerning: 1,
    lineSpacing: 0,
    alignment: 'left',
    styleKey: 'text',
  };
  const updatedPage = addLayer(
    page,
    'text-block',
    'Editable Text',
    { col: 2, row: 3, width: 12, height: 4 },
    'text',
    props,
  );
  const layerId = updatedPage.layerOrder[updatedPage.layerOrder.length - 1]!;

  useDocumentStore.setState({
    document: {
      ...doc,
      pages: doc.pages.map((entry) => (entry.id === activePageId ? updatedPage : entry)),
    },
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    editingLayerId: layerId,
    selectedLayerIds: [layerId],
  });

  return layerId;
}

describe('TextEditor', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          font: '',
          measureText: () => ({ width: 8.4 }),
        }) as unknown as CanvasRenderingContext2D,
    );
    useDocumentStore.setState({
      document: createEmptyDocument('Test'),
      undoStack: [],
      redoStack: [],
    });
    useUiStore.setState({
      editingLayerId: null,
      selectedLayerIds: [],
    });
    useViewportStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      cursorGridPos: null,
      gridOverlayVisible: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stops edit interactions from bubbling to the canvas', () => {
    setupEditingTextBlock();
    const onPointerDown = vi.fn();
    const onMouseDown = vi.fn();
    const onDoubleClick = vi.fn();
    const onWheel = vi.fn();

    render(
      <div
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
      >
        <TextEditor />
      </div>,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.pointerDown(textarea);
    fireEvent.mouseDown(textarea);
    fireEvent.doubleClick(textarea);
    fireEvent.wheel(textarea);

    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onMouseDown).not.toHaveBeenCalled();
    expect(onDoubleClick).not.toHaveBeenCalled();
    expect(onWheel).not.toHaveBeenCalled();
  });
});
