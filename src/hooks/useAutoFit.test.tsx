import { act, cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useAutoFit } from './useAutoFit.ts';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

function AutoFitHarness() {
  const ref = useRef<HTMLDivElement>(null);
  useAutoFit(ref);
  return <div ref={ref} />;
}

describe('useAutoFit', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalApplyAutoFit = useViewportStore.getState().applyAutoFit;

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);

    const doc = createEmptyDocument();
    const page = doc.pages[0]!;
    useDocumentStore.setState({
      document: {
        ...doc,
        pages: [
          {
            ...page,
            canvasColsOverride: 300,
            canvasRowsOverride: 80,
          },
        ],
      },
      undoStack: [],
      redoStack: [],
    });

    useViewportStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      autoFitEnabled: true,
      viewportWidth: 800,
      viewportHeight: 600,
      cursorGridPos: null,
      applyAutoFit: originalApplyAutoFit,
    });
  });

  afterEach(() => {
    cleanup();
    useViewportStore.setState({ applyAutoFit: originalApplyAutoFit });
    if (originalResizeObserver) {
      vi.stubGlobal('ResizeObserver', originalResizeObserver);
    } else {
      vi.unstubAllGlobals();
    }
  });

  it('re-applies auto-fit when font metrics change on an overridden page', () => {
    const applyAutoFitSpy = vi.fn();
    useViewportStore.setState({ applyAutoFit: applyAutoFitSpy });

    render(<AutoFitHarness />);
    expect(applyAutoFitSpy).toHaveBeenCalledTimes(1);

    act(() => {
      const state = useDocumentStore.getState();
      useDocumentStore.setState({
        document: {
          ...state.document,
          gridConfig: {
            ...state.document.gridConfig,
            fontSize: 20,
          },
        },
      });
    });

    expect(applyAutoFitSpy).toHaveBeenCalledTimes(2);
  });
});
