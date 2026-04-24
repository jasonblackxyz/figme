import { useDocumentStore } from '@stores/documentStore.ts';
import type { FigmiiDocument } from '@primitives/document-model/types.ts';

let depth = 0;
let pendingDoc: FigmiiDocument | null = null;

/**
 * Returns true if currently inside a batch() call.
 * Used by convenience methods in agentApi to skip redundant pushUndo() calls
 * and by the console logger as a defense-in-depth guard.
 */
export function isBatching(): boolean {
  return depth > 0;
}

/**
 * Returns the pending document state during a batch, or null outside a batch.
 * Read helpers in agentApi should prefer this over store.getState() so that
 * mutations within a batch are visible to subsequent reads.
 */
export function getPendingDocument(): FigmiiDocument | null {
  return pendingDoc;
}

/**
 * Update the pending document state during a batch.
 * Throws if called outside a batch — callers should use store.setDocument() instead.
 */
export function setPendingDocument(doc: FigmiiDocument): void {
  if (depth === 0) {
    throw new Error('setPendingDocument called outside batch — use store.setDocument() instead');
  }
  pendingDoc = doc;
}

/**
 * Execute multiple mutations with a single undo entry and a single store notification.
 *
 * All synchronous mutations inside fn are accumulated in memory. The Zustand store
 * is updated exactly once when the outermost batch completes, which means:
 *   - React re-renders happen once (not N times)
 *   - Console logger fires once (not N times)
 *   - Subscribers see one state transition
 *
 * On error, pending changes are discarded (transactional rollback) and the error
 * is re-thrown. The document remains unchanged.
 *
 * Usage from console: Figmii.batch(() => { Figmii.addLayer(...); Figmii.addLayer(...); })
 */
export function batch(fn: () => void): void {
  if (depth === 0) {
    const store = useDocumentStore.getState();
    store.pushUndo();
    pendingDoc = store.document;
  }
  depth++;
  try {
    fn();
  } catch (err) {
    depth--;
    if (depth === 0) {
      pendingDoc = null; // discard on error
    }
    throw err;
  }
  depth--;
  if (depth === 0) {
    const doc = pendingDoc!;
    pendingDoc = null;
    useDocumentStore.getState().setDocument(doc); // single notification
  }
}
