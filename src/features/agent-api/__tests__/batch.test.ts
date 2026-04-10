import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@stores/documentStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { buildApi } from '../agentApi.ts';

// Build a fresh API for each test — the module-level batch state (depth, pendingDoc)
// is shared, but reset implicitly because each test starts outside any batch.
let api: ReturnType<typeof buildApi>;

/**
 * Subscribe to only document-changing notifications on the store.
 * pushUndo() also fires subscribers (for undoStack/redoStack), but we want to
 * count only the notifications where the document reference actually changed —
 * matching how useConsoleLogger filters.
 */
function subscribeToDocumentChanges(cb: () => void): () => void {
  let prevDoc = useDocumentStore.getState().document;
  return useDocumentStore.subscribe((state) => {
    if (state.document !== prevDoc) {
      prevDoc = state.document;
      cb();
    }
  });
}

describe('batch()', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      document: createEmptyDocument(),
      undoStack: [],
      redoStack: [],
    });
    api = buildApi();
  });

  it('fires document-change notification exactly once for multiple addLayer calls', () => {
    const listener = vi.fn();
    const unsub = subscribeToDocumentChanges(listener);

    api.batch(() => {
      api.addLayer('border-box', 'A', { col: 2, row: 2, width: 10, height: 5 }, 'border');
      api.addLayer('border-box', 'B', { col: 15, row: 2, width: 10, height: 5 }, 'border');
      api.addLayer('text-block', 'C', { col: 2, row: 10, width: 20, height: 3 }, 'text');
    });

    unsub();
    // The document-change notification should fire exactly once (final setDocument at batch end)
    expect(listener).toHaveBeenCalledTimes(1);
    // All three layers should be present (+ 1 Background layer)
    expect(api.getLayers()).toHaveLength(4);
  });

  it('supports read-after-write within a batch', () => {
    api.batch(() => {
      api.addLayer('border-box', 'First', { col: 0, row: 0, width: 10, height: 5 }, 'border');

      // getLayers() inside batch should see the layer just added (+ 1 Background layer)
      const layers = api.getLayers();
      expect(layers).toHaveLength(2);
      expect(layers[1]!.name).toBe('First');

      // getDocument() inside batch should also reflect the pending state
      const doc = api.getDocument();
      const page = doc.pages.find(p => p.id === doc.activePageId);
      expect(page?.layerOrder).toHaveLength(2);
    });
  });

  it('handles nested batches — document-change notification fires once at outermost', () => {
    const listener = vi.fn();
    const unsub = subscribeToDocumentChanges(listener);

    api.batch(() => {
      api.addLayer('border-box', 'Outer', { col: 0, row: 0, width: 10, height: 5 }, 'border');

      api.batch(() => {
        api.addLayer('border-box', 'Inner', { col: 15, row: 0, width: 10, height: 5 }, 'border');
      });

      // After inner batch completes, layers should still be accumulating (+ 1 Background layer)
      expect(api.getLayers()).toHaveLength(3);
    });

    unsub();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(api.getLayers()).toHaveLength(3);
  });

  it('discards changes on error (transactional rollback)', () => {
    const docBefore = useDocumentStore.getState().document;
    const listener = vi.fn();
    const unsub = subscribeToDocumentChanges(listener);

    expect(() => {
      api.batch(() => {
        api.addLayer('border-box', 'OK', { col: 0, row: 0, width: 10, height: 5 }, 'border');
        throw new Error('intentional error');
      });
    }).toThrow('intentional error');

    unsub();
    // Document should be unchanged — the layer was discarded (Background layer still present)
    expect(useDocumentStore.getState().document).toBe(docBefore);
    expect(api.getLayers()).toHaveLength(1);
    // No document-change notification should have fired
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it('fires document-change notification immediately for addLayer outside batch', () => {
    const listener = vi.fn();
    const unsub = subscribeToDocumentChanges(listener);

    api.addLayer('border-box', 'Solo', { col: 0, row: 0, width: 10, height: 5 }, 'border');

    unsub();
    // Outside batch, each mutation fires the subscriber directly
    expect(listener).toHaveBeenCalledTimes(1);
    expect(api.getLayers()).toHaveLength(2);
  });

  it('single undo reverts all mutations from one batch', () => {
    // Add a layer outside batch first (+ 1 Background layer)
    api.addLayer('border-box', 'Pre', { col: 0, row: 0, width: 10, height: 5 }, 'border');
    expect(api.getLayers()).toHaveLength(2);

    // Batch-add two more layers
    api.batch(() => {
      api.addLayer('border-box', 'Batch1', { col: 15, row: 0, width: 10, height: 5 }, 'border');
      api.addLayer('border-box', 'Batch2', { col: 30, row: 0, width: 10, height: 5 }, 'border');
    });
    expect(api.getLayers()).toHaveLength(4);

    // Single undo should revert the entire batch
    useDocumentStore.getState().undo();
    expect(api.getLayers()).toHaveLength(2);
    expect(api.getLayers()[1]!.name).toBe('Pre');
  });

  it('addPage works inside batch', () => {
    api.batch(() => {
      api.addLayer('border-box', 'OnPage1', { col: 0, row: 0, width: 10, height: 5 }, 'border');
      const newPageId = api.addPage('Page 2');
      expect(newPageId).toBeTruthy();
      // After addPage, active page switches — getLayers returns Background layer for new page
      expect(api.getLayers()).toHaveLength(1);
    });

    // Both pages should exist
    const doc = api.getDocument();
    expect(doc.pages).toHaveLength(2);
  });

  it('getPage reads pending state during batch', () => {
    const originalPageId = api.getDocument().activePageId;

    api.batch(() => {
      const newPageId = api.addPage('New Page');
      const page = api.getPage(newPageId);
      expect(page).toBeDefined();
      expect(page!.name).toBe('New Page');

      // Switch back to original page
      api.setActivePage(originalPageId);
      expect(api.getDocument().activePageId).toBe(originalPageId);
    });
  });
});
