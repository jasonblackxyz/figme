import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';

/**
 * Hook that logs state changes to the console for AI agent consumption.
 * Subscribes to document, UI, and tool store changes and emits
 * structured FIGME_STATE events that agents can observe.
 */
export function useConsoleLogger(): void {
  // Log initial state on mount
  useEffect(() => {
    const doc = useDocumentStore.getState().document;
    console.log('FIGME_STATE', {
      action: 'init',
      timestamp: Date.now(),
      document: {
        name: doc.name,
        pageCount: doc.pages.length,
        activePageId: doc.activePageId,
        componentCount: Object.keys(doc.components).length,
      },
    });
  }, []);

  // Subscribe to document changes
  useEffect(() => {
    const unsub = useDocumentStore.subscribe((state, prevState) => {
      if (state.document === prevState.document) return;
      const doc = state.document;
      const activePage = doc.pages.find((p) => p.id === doc.activePageId);
      console.log('FIGME_STATE', {
        action: 'document_change',
        timestamp: Date.now(),
        document: {
          name: doc.name,
          pageCount: doc.pages.length,
          activePageId: doc.activePageId,
          layerCount: activePage ? Object.keys(activePage.layers).length : 0,
          componentCount: Object.keys(doc.components).length,
        },
      });
    });
    return unsub;
  }, []);

  // Subscribe to selection changes
  useEffect(() => {
    const unsub = useUiStore.subscribe((state, prevState) => {
      if (state.selectedLayerIds === prevState.selectedLayerIds) return;
      console.log('FIGME_STATE', {
        action: 'selection_change',
        timestamp: Date.now(),
        selectedLayerIds: state.selectedLayerIds,
      });
    });
    return unsub;
  }, []);

  // Subscribe to tool changes
  useEffect(() => {
    const unsub = useToolStore.subscribe((state, prevState) => {
      if (state.activeTool === prevState.activeTool) return;
      console.log('FIGME_STATE', {
        action: 'tool_change',
        timestamp: Date.now(),
        activeTool: state.activeTool,
      });
    });
    return unsub;
  }, []);
}
