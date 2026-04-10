import { useState, useRef, useEffect, useCallback } from 'react';
import type { Layer } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer, moveLayerToGroup } from '@primitives/document-model/operations.ts';
import styles from './LayersPanel.module.css';

interface LayerRowProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  depth: number;
  isGroup: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type DropZone = 'before' | 'after' | 'inside' | null;

export function LayerRow({ layer, isSelected, onSelect, depth, isGroup, isCollapsed, onToggleCollapse }: LayerRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const docStore = useDocumentStore.getState();
    const doc = docStore.document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    docStore.pushUndo();
    const updatedPage = updateLayer(page, layer.id, { visible: !layer.visible });
    docStore.setDocument({
      ...doc,
      pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
    });
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const docStore = useDocumentStore.getState();
    const doc = docStore.document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;
    docStore.pushUndo();
    const updatedPage = updateLayer(page, layer.id, { locked: !layer.locked });
    docStore.setDocument({
      ...doc,
      pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
    });
  };

  const commitRename = () => {
    setIsRenaming(false);
    if (editName.trim() && editName !== layer.name) {
      const docStore = useDocumentStore.getState();
      const doc = docStore.document;
      const page = doc.pages.find(p => p.id === doc.activePageId);
      if (!page) return;
      docStore.pushUndo();
      const updatedPage = updateLayer(page, layer.id, { name: editName.trim() });
      docStore.setDocument({
        ...doc,
        pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
      });
    } else {
      setEditName(layer.name);
    }
  };

  // -- Drag and drop ---------------------------------------------------------

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (layer.isBackground) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', layer.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [layer.id, layer.isBackground]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = (e.clientY - rect.top) / rect.height;
    if (isGroup && y > 0.25 && y < 0.75) {
      setDropZone('inside');
    } else if (y < 0.5) {
      setDropZone('before');
    } else {
      setDropZone('after');
    }
  }, [isGroup]);

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropZone(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === layer.id) return;

    const docStore = useDocumentStore.getState();
    const doc = docStore.document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    if (!page) return;

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = (e.clientY - rect.top) / rect.height;

    docStore.pushUndo();

    let updatedPage = page;
    if (isGroup && y > 0.25 && y < 0.75) {
      // Drop inside group
      updatedPage = moveLayerToGroup(updatedPage, draggedId, layer.id);
    } else {
      // Drop before/after this layer in its parent
      const parentId = layer.parentId ?? null;
      const siblings = parentId
        ? (page.layers[parentId]?.children ?? [])
        : page.layerOrder;
      const targetIdx = siblings.indexOf(layer.id);
      const draggedIdx = siblings.indexOf(draggedId);
      // Reversed display: top half = "before" in UI = insert after in array
      let insertIdx = y < 0.5 ? targetIdx + 1 : targetIdx;
      // Adjust for index shift when dragging within the same sibling list
      if (draggedIdx !== -1 && draggedIdx < targetIdx) {
        insertIdx--;
      }
      updatedPage = moveLayerToGroup(updatedPage, draggedId, parentId, insertIdx);
    }

    docStore.setDocument({
      ...doc,
      pages: doc.pages.map(p => p.id === page.id ? updatedPage : p),
    });
  }, [layer.id, layer.parentId, isGroup]);

  const dropClass = dropZone === 'before' ? styles.dropBefore
    : dropZone === 'after' ? styles.dropAfter
    : dropZone === 'inside' ? styles.dropInside
    : '';

  return (
    <div
      ref={rowRef}
      className={`${styles.layerRow} ${isSelected ? styles.selected : ''} ${!layer.visible ? styles.hidden : ''} ${layer.isBackground ? styles.backgroundRow : ''} ${dropClass}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={(e) => onSelect(e.shiftKey)}
      onDoubleClick={() => {
        setIsRenaming(true);
        setEditName(layer.name);
      }}
      draggable={!layer.isBackground}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isGroup ? (
        <button
          className={styles.disclosureTriangle}
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
        >
          <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>
            {'\u25BE'}
          </span>
        </button>
      ) : (
        <span className={styles.disclosureSpacer} />
      )}
      <button
        className={styles.visibilityToggle}
        onClick={toggleVisibility}
        aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
        data-action="toggle-visibility"
      >
        {layer.visible ? '\u{1F441}' : '\u2014'}
      </button>
      <button
        className={styles.lockToggle}
        onClick={toggleLock}
        aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
        data-action="toggle-lock"
      >
        {layer.locked ? '\u{1F512}' : ' '}
      </button>
      {isRenaming ? (
        <input
          ref={inputRef}
          className={styles.nameInput}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setIsRenaming(false); setEditName(layer.name); }
          }}
        />
      ) : (
        <span className={styles.layerName} data-property="name">{layer.name}</span>
      )}
      <span className={styles.layerKind}>{layer.kind}</span>
    </div>
  );
}
