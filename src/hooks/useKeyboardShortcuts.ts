import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { removeLayer } from '@primitives/document-model/operations.ts';
import { saveDocument } from '@features/file-io/fileSaveLoad.ts';

/**
 * Hook that registers global keyboard shortcuts for the design tool.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs/textareas/selects
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Z: undo
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useDocumentStore.getState().undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: redo
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault();
        useDocumentStore.getState().redo();
        return;
      }

      // Ctrl+Shift+E: toggle export dialog
      if (ctrl && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        useUiStore.getState().toggleExportDialog();
        return;
      }

      // Ctrl+Shift+S: toggle spec view
      if (ctrl && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        useUiStore.getState().toggleSpecView();
        return;
      }

      // Ctrl+S: save document (must be after Ctrl+Shift+S check)
      if (ctrl && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        void saveDocument(useDocumentStore.getState().document);
        return;
      }

      // Ctrl+0: reset view
      if (ctrl && e.key === '0') {
        e.preventDefault();
        useViewportStore.getState().resetView();
        return;
      }

      // Ctrl+= or Ctrl++: zoom in
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const state = useViewportStore.getState();
        state.setZoom(state.zoom + 0.25);
        return;
      }

      // Ctrl+-: zoom out
      if (ctrl && e.key === '-') {
        e.preventDefault();
        const state = useViewportStore.getState();
        state.setZoom(state.zoom - 0.25);
        return;
      }

      // Ctrl+': toggle grid overlay
      if (ctrl && e.key === "'") {
        e.preventDefault();
        useViewportStore.getState().toggleGridOverlay();
        return;
      }

      // Ctrl+;: toggle smart guides
      if (ctrl && e.key === ';') {
        e.preventDefault();
        useUiStore.getState().toggleSmartGuides();
        return;
      }

      // Ctrl+Shift+\: toggle properties panel
      if (ctrl && e.shiftKey && e.code === 'Backslash') {
        e.preventDefault();
        useUiStore.getState().togglePropertiesPanel();
        return;
      }

      // Ctrl+\: toggle layers panel
      if (ctrl && !e.shiftKey && e.code === 'Backslash') {
        e.preventDefault();
        useUiStore.getState().toggleLayersPanel();
        return;
      }

      // Don't process single-key shortcuts if ctrl is held
      if (ctrl) return;

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          useToolStore.getState().setActiveTool('select');
          return;
        case 'b':
          useToolStore.getState().setActiveTool('border-box');
          return;
        case 'd':
          useToolStore.getState().setActiveTool('divider');
          return;
        case 'h':
          useToolStore.getState().setActiveTool('hand');
          return;
        case 't':
          useToolStore.getState().setActiveTool('text-block');
          return;
        case 'f':
          useToolStore.getState().setActiveTool('figlet-text');
          return;
        case 'p':
          useToolStore.getState().setActiveTool('draw');
          return;
      }

      // Delete/Backspace: delete selected layers
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const uiState = useUiStore.getState();
        const selected = uiState.selectedLayerIds;
        if (selected.length === 0) return;

        const docStore = useDocumentStore.getState();
        docStore.pushUndo();

        const doc = docStore.document;
        const pageIndex = doc.pages.findIndex((p) => p.id === doc.activePageId);
        if (pageIndex === -1) return;

        let page = doc.pages[pageIndex]!;
        for (const layerId of selected) {
          page = removeLayer(page, layerId);
        }

        const updatedDoc = {
          ...doc,
          pages: doc.pages.map((p, i) => (i === pageIndex ? page : p)),
        };

        docStore.setDocument(updatedDoc);
        uiState.setSelectedLayers([]);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
