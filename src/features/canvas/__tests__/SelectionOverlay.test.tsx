import { fireEvent, render } from '@testing-library/react';
import { SelectionOverlay } from '@features/canvas/SelectionOverlay.tsx';
import { addLayer, createEmptyDocument } from '@primitives/document-model/operations.ts';
import type { BorderBoxProperties } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { vi } from 'vitest';

const BORDER_BOX_PROPS: BorderBoxProperties = {
  borderStyle: 'rounded',
  padding: { top: 1, right: 1, bottom: 1, left: 1 },
};

function setupSelectionOverlay(locked = false) {
  const doc = createEmptyDocument('Test Doc');
  const pageId = doc.activePageId;
  let page = doc.pages.find((candidate) => candidate.id === pageId)!;
  page = addLayer(
    page,
    'border-box',
    'Resizable Box',
    { col: 5, row: 5, width: 8, height: 6 },
    'border',
    BORDER_BOX_PROPS,
  );

  const layerId = page.layerOrder[0]!;
  if (locked) {
    page = {
      ...page,
      layers: {
        ...page.layers,
        [layerId]: {
          ...page.layers[layerId]!,
          locked: true,
        },
      },
    };
  }

  useDocumentStore.setState({
    document: {
      ...doc,
      pages: doc.pages.map((candidate) => (candidate.id === pageId ? page : candidate)),
    },
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedLayerIds: [layerId],
    marqueeRect: null,
    isDragging: false,
    dragStartPos: null,
  });
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    cursorGridPos: null,
    gridOverlayVisible: false,
  });

  const view = render(
    <div data-testid="canvas-viewport">
      <SelectionOverlay gridConfig={doc.gridConfig} panX={0} panY={0} />
    </div>,
  );

  const viewport = view.getByTestId('canvas-viewport');
  Object.defineProperty(viewport, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 500,
      width: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  });

  return { ...view, layerId };
}

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument('Test'),
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    selectedLayerIds: [],
    marqueeRect: null,
    isDragging: false,
    dragStartPos: null,
    editingLayerId: null,
  });
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    cursorGridPos: null,
    gridOverlayVisible: false,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => ({
      font: '',
      measureText: () => ({ width: 8.4 }),
    })),
  });
});

describe('SelectionOverlay', () => {
  it('does not render resize handles for locked selections', () => {
    const { container } = setupSelectionOverlay(true);

    expect(container.querySelector('[data-handle]')).toBeNull();
  });

  it('cleans up resize listeners on pointercancel', () => {
    const { container } = setupSelectionOverlay(false);
    const handle = container.querySelector('[data-handle="e"]') as HTMLDivElement;
    const removeEventListenerSpy = vi.spyOn(handle, 'removeEventListener');

    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 120, clientY: 120 });
    fireEvent.pointerCancel(handle, { pointerId: 7, clientX: 120, clientY: 120 });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'lostpointercapture',
      expect.any(Function),
    );
  });
});
