import { useDocumentStore } from '@stores/documentStore.ts';

let depth = 0;

/**
 * Returns true if currently inside a batch() call.
 * Used by convenience methods in agentApi to skip redundant pushUndo() calls.
 */
export function isBatching(): boolean {
  return depth > 0;
}

/**
 * Execute multiple mutations with a single undo entry.
 * All synchronous setDocument calls inside fn are batched by React 18+/Zustand.
 *
 * Usage from console: FigMe.batch(() => { FigMe.addLayer(...); FigMe.addLayer(...); })
 */
export function batch(fn: () => void): void {
  if (depth === 0) {
    useDocumentStore.getState().pushUndo();
  }
  depth++;
  try {
    fn();
  } finally {
    depth--;
  }
}
