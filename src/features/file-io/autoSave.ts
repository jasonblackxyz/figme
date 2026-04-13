import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { saveToDB, saveToLocalStorage } from './persistenceDb.ts';

export function useAutoSave(intervalMs = 10000): void {
  useEffect(() => {
    const timer = setInterval(() => {
      const doc = useDocumentStore.getState().document;
      // Synchronous localStorage write (fast, always available)
      saveToLocalStorage(doc);
      // Async IndexedDB write (fire-and-forget, larger capacity)
      saveToDB(doc).catch(() => {});
    }, intervalMs);

    // Flush to localStorage on tab close — synchronous so it completes
    // before the page unloads (IndexedDB is async and may not finish)
    const handleBeforeUnload = () => {
      saveToLocalStorage(useDocumentStore.getState().document);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [intervalMs]);
}
