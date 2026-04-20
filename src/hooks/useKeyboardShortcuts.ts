import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore, isToolAllowedInInterfaceMode, type ToolType } from '@stores/toolStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { removeLayer } from '@primitives/document-model/operations.ts';
import { saveDocument } from '@features/file-io/fileSaveLoad.ts';
import { importFile } from '@features/import/importFile.ts';

/**
 * Hook that registers global keyboard shortcuts for the design tool.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const uiState = useUiStore.getState();

      if (uiState.exportDialogOpen) {
        if (e.key === 'Escape' || (ctrl && e.shiftKey && (e.key === 'E' || e.key === 'e'))) {
          e.preventDefault();
          uiState.toggleExportDialog();
        }
        return;
      }

      // Don't fire when typing in inputs/textareas/selects
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Don't fire shortcuts while a text layer is being edited (closes the
      // timing gap between setEditingLayerId being called and the textarea
      // actually receiving focus via useEffect)
      if (uiState.editingLayerId !== null) return;

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

      // Ctrl+Shift+M: toggle interface mode (AI/Human)
      if (ctrl && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        useUiStore.getState().toggleInterfaceMode();
        return;
      }

      // Ctrl+O: import file
      if (ctrl && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        void importFile().then((doc) => {
          if (doc) useDocumentStore.getState().setDocument(doc);
        });
        return;
      }

      // Ctrl+S: save document (must be after Ctrl+Shift+S check)
      if (ctrl && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        void saveDocument(useDocumentStore.getState().document);
        return;
      }

      // Ctrl+1: fit to page (auto-fit)
      if (ctrl && e.key === '1') {
        e.preventDefault();
        useViewportStore.getState().setAutoFitEnabled(true);
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

      // Ctrl+;: toggle smart guides
      if (ctrl && e.key === ';') {
        e.preventDefault();
        useUiStore.getState().toggleSmartGuides();
        return;
      }

      // -- Layer z-order shortcuts (Figma-style) --

      // Cmd+Alt+] / Cmd+Alt+[: bring to front / send to back
      if (ctrl && e.altKey && e.key === ']') {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().bringToFront();
        }
        return;
      }
      if (ctrl && e.altKey && e.key === '[') {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().sendToBack();
        }
        return;
      }

      // Cmd+] / Cmd+[: bring forward / send backward (one step)
      if (ctrl && !e.altKey && e.key === ']') {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().bringForward();
        }
        return;
      }
      if (ctrl && !e.altKey && e.key === '[') {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().sendBackward();
        }
        return;
      }

      // Cmd+Shift+G: ungroup (must be before Cmd+G)
      if (ctrl && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().ungroupSelectedLayers();
        }
        return;
      }

      // Cmd+G: group
      if (ctrl && !e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 1) {
          useDocumentStore.getState().groupSelectedLayers();
        }
        return;
      }

      // Cmd+Shift+L: toggle lock on selection
      if (ctrl && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().toggleLockOnSelection();
        }
        return;
      }

      // Cmd+Shift+H: toggle visibility on selection
      if (ctrl && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        if (useUiStore.getState().selectedLayerIds.length > 0) {
          useDocumentStore.getState().toggleVisibilityOnSelection();
        }
        return;
      }

      // Don't process single-key shortcuts if ctrl is held
      if (ctrl) return;

      // Tool shortcuts
      const toolShortcuts: Partial<Record<string, ToolType>> = {
        v: 'select',
        b: 'border-box',
        d: 'divider',
        h: 'hand',
        t: 'text-block',
        f: 'figlet-text',
        p: 'draw',
      };
      const shortcutTool = toolShortcuts[e.key.toLowerCase()];
      if (shortcutTool) {
        const mode = useUiStore.getState().interfaceMode;
        e.preventDefault();
        useToolStore.getState().setActiveTool(
          isToolAllowedInInterfaceMode(shortcutTool, mode) ? shortcutTool : 'select',
        );
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
