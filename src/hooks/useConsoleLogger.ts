import { useEffect, useRef } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';

/**
 * Hook that logs state changes to the console for agent consumption.
 *
 * Subscribes to document, tool, and UI store changes and logs structured
 * FIGME_* events that the AI coding agent can read via the browser console.
 */
export function useConsoleLogger(): void {
  const prevDocRef = useRef(useDocumentStore.getState().document);
  const prevToolRef = useRef(useToolStore.getState().activeTool);
  const prevSelectionRef = useRef(useUiStore.getState().selectedLayerIds);
  const prevEditingRef = useRef(useUiStore.getState().editingLayerId);

  useEffect(() => {
    // Log initial state (summary only — avoid serialising the full document)
    const initDoc = useDocumentStore.getState().document;
    console.log('FIGME_STATE', {
      action: 'init',
      timestamp: Date.now(),
      document: {
        name: initDoc.name,
        pageCount: initDoc.pages.length,
        activePageId: initDoc.activePageId,
        componentCount: Object.keys(initDoc.components).length,
      },
    });

    // Subscribe to document changes
    const unsubDoc = useDocumentStore.subscribe((state) => {
      const prevDoc = prevDocRef.current;
      const nextDoc = state.document;

      if (prevDoc === nextDoc) return;

      // Detect property-level changes on layers
      const prevPage = prevDoc.pages.find((p) => p.id === prevDoc.activePageId);
      const nextPage = nextDoc.pages.find((p) => p.id === nextDoc.activePageId);

      if (prevPage && nextPage && prevPage.id === nextPage.id) {
        for (const layerId of nextPage.layerOrder) {
          const prevLayer = prevPage.layers[layerId];
          const nextLayer = nextPage.layers[layerId];
          if (prevLayer && nextLayer && prevLayer !== nextLayer) {
            const changes: Record<string, unknown> = {};
            for (const key of Object.keys(nextLayer) as Array<keyof typeof nextLayer>) {
              if (prevLayer[key] !== nextLayer[key]) {
                changes[key] = nextLayer[key];
              }
            }
            if (Object.keys(changes).length > 0) {
              console.log('FIGME_PROPERTY_CHANGE', {
                timestamp: Date.now(),
                layerId,
                layerName: nextLayer.name,
                changes,
              });
            }
          }
        }
      }

      console.log('FIGME_STATE', {
        action: 'document_change',
        timestamp: Date.now(),
        document: nextDoc,
      });

      prevDocRef.current = nextDoc;
    });

    // Subscribe to tool changes
    const unsubTool = useToolStore.subscribe((state) => {
      const prevTool = prevToolRef.current;
      const nextTool = state.activeTool;

      if (prevTool === nextTool) return;

      console.log('FIGME_STATE', {
        action: 'tool_change',
        timestamp: Date.now(),
        previousTool: prevTool,
        activeTool: nextTool,
      });

      prevToolRef.current = nextTool;
    });

    // Subscribe to selection changes
    const unsubSelection = useUiStore.subscribe((state) => {
      const prevSelection = prevSelectionRef.current;
      const nextSelection = state.selectedLayerIds;

      if (prevSelection === nextSelection) return;

      console.log('FIGME_STATE', {
        action: 'selection_change',
        timestamp: Date.now(),
        previousSelection: prevSelection,
        selectedLayerIds: nextSelection,
      });

      prevSelectionRef.current = nextSelection;
    });

    // Subscribe to text edit mode changes
    const unsubEditing = useUiStore.subscribe((state) => {
      const prevEditing = prevEditingRef.current;
      const nextEditing = state.editingLayerId;

      if (prevEditing === nextEditing) return;

      if (nextEditing) {
        console.log('FIGME_STATE', {
          action: 'text_edit_start',
          timestamp: Date.now(),
          layerId: nextEditing,
        });
      } else if (prevEditing) {
        console.log('FIGME_STATE', {
          action: 'text_edit_end',
          timestamp: Date.now(),
          layerId: prevEditing,
        });
      }

      prevEditingRef.current = nextEditing;
    });

    return () => {
      unsubDoc();
      unsubTool();
      unsubSelection();
      unsubEditing();
    };
  }, []);
}
