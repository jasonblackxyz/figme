import { useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { addLayer, removeLayer } from '@primitives/document-model/operations.ts';
import type { Layer } from '@primitives/document-model/types.ts';

// Internal clipboard (for layer data — richer than system clipboard)
let internalClipboard: Layer[] = [];

export function useClipboard(): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (isCtrl && e.key === 'x') {
        e.preventDefault();
        handleCut();
      } else if (isCtrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function handleCopy() {
  const selectedIds = useUiStore.getState().selectedLayerIds;
  if (selectedIds.length === 0) return;

  const doc = useDocumentStore.getState().document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;

  const layers: Layer[] = [];
  for (const id of selectedIds) {
    const layer = page.layers[id];
    if (layer) layers.push(layer);
  }

  internalClipboard = layers;

  // Also copy as text to system clipboard (best effort)
  try {
    const text = layers.map(l => l.name).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  } catch {
    // Clipboard API unavailable
  }
}

function handleCut() {
  handleCopy();

  // Delete selected layers
  const selectedIds = useUiStore.getState().selectedLayerIds;
  if (selectedIds.length === 0) return;

  const docStore = useDocumentStore.getState();
  docStore.pushUndo();

  const doc = docStore.document;
  let page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;

  for (const id of selectedIds) {
    page = removeLayer(page, id);
  }

  docStore.setDocument({
    ...doc,
    pages: doc.pages.map(p => p.id === doc.activePageId ? page! : p),
  });
  useUiStore.getState().setSelectedLayers([]);
}

function handlePaste() {
  if (internalClipboard.length === 0) return;

  const docStore = useDocumentStore.getState();
  docStore.pushUndo();

  const doc = docStore.document;
  let page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return;

  const newIds: string[] = [];

  for (const srcLayer of internalClipboard) {
    // Offset pasted layers by +2,+2
    const rect = {
      col: srcLayer.rect.col + 2,
      row: srcLayer.rect.row + 2,
      width: srcLayer.rect.width,
      height: srcLayer.rect.height,
    };

    page = addLayer(page, srcLayer.kind, srcLayer.name + ' copy', rect, srcLayer.styleKey, srcLayer.properties);
    const lastId = page.layerOrder[page.layerOrder.length - 1];
    if (lastId) newIds.push(lastId);
  }

  docStore.setDocument({
    ...doc,
    pages: doc.pages.map(p => p.id === doc.activePageId ? page! : p),
  });
  useUiStore.getState().setSelectedLayers(newIds);
}
