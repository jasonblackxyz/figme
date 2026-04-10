import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { deserializeDocument } from '@primitives/document-model/serialization.ts';
import type { FigMeDocument } from '@primitives/document-model/types.ts';

export function useAutoSave(intervalMs = 30000): void {
  useEffect(() => {
    const timer = setInterval(() => {
      const doc = useDocumentStore.getState().document;
      try {
        localStorage.setItem('figme_autosave', JSON.stringify(doc));
      } catch {
        // Storage full or unavailable -- silently skip
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
}

export function loadAutoSave(): FigMeDocument | null {
  try {
    const saved = localStorage.getItem('figme_autosave');
    if (saved) return deserializeDocument(saved);
  } catch {
    // Invalid JSON or storage unavailable
  }
  return null;
}
