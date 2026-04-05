import { useState, useRef, useEffect } from 'react';
import type { Layer } from '@primitives/document-model/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import styles from './LayersPanel.module.css';

interface LayerRowProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
}

export function LayerRow({ layer, isSelected, onSelect }: LayerRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <li
      role="treeitem"
      aria-label={layer.name}
      aria-selected={isSelected}
      data-layer-id={layer.id}
      data-layer-kind={layer.kind}
      className={`${styles.layerRow} ${isSelected ? styles.selected : ''} ${!layer.visible ? styles.hidden : ''}`}
      onClick={(e) => onSelect(e.shiftKey)}
      onDoubleClick={() => {
        setIsRenaming(true);
        setEditName(layer.name);
      }}
    >
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
    </li>
  );
}
