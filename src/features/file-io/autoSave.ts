import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { saveToDB, saveToLocalStorage } from './persistenceDb.ts';
import { getTabId } from './tabSession.ts';
import { writeHeartbeat } from './staleCleanup.ts';

export function useAutoSave(intervalMs = 10000): void {
  useEffect(() => {
    const tabId = getTabId();

    // Write initial heartbeat immediately
    writeHeartbeat(tabId);

    const timer = setInterval(() => {
      const doc = useDocumentStore.getState().document;
      // Synchronous localStorage write (fast, always available)
      saveToLocalStorage(doc, tabId);
      // Async IndexedDB write (fire-and-forget, larger capacity)
      saveToDB(doc, tabId).catch(() => {});
      // Update heartbeat for stale-tab detection
      writeHeartbeat(tabId);
    }, intervalMs);

    // Flush to localStorage on tab close — synchronous so it completes
    // before the page unloads (IndexedDB is async and may not finish)
    const handleBeforeUnload = () => {
      saveToLocalStorage(useDocumentStore.getState().document, tabId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [intervalMs]);
}
