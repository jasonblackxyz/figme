import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';

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

export function loadAutoSave(): ReturnType<typeof JSON.parse> | null {
  try {
    const saved = localStorage.getItem('figme_autosave');
    if (saved) return JSON.parse(saved) as ReturnType<typeof JSON.parse>;
  } catch {
    // Invalid JSON or storage unavailable
  }
  return null;
}
