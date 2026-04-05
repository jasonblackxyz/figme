import { useState, useCallback, useRef, useEffect } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { addPage, removePage, setActivePage } from '@primitives/document-model/operations.ts';
import type { FigMePage } from '@primitives/document-model/types.ts';
import styles from './ArtboardTabs.module.css';

interface ContextMenuState {
  pageId: string;
  x: number;
  y: number;
}

export function ArtboardTabs() {
  const doc = useDocumentStore(s => s.document);
  const pushUndo = useDocumentStore(s => s.pushUndo);
  const setDocument = useDocumentStore(s => s.setDocument);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingPageId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPageId]);

  const handleTabClick = useCallback(
    (pageId: string) => {
      if (pageId === doc.activePageId) return;
      pushUndo();
      setDocument(setActivePage(doc, pageId));
    },
    [doc, pushUndo, setDocument],
  );

  const handleDoubleClick = useCallback(
    (page: FigMePage) => {
      setEditingPageId(page.id);
      setEditingName(page.name);
    },
    [],
  );

  const commitRename = useCallback(() => {
    if (!editingPageId) return;
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== doc.pages.find(p => p.id === editingPageId)?.name) {
      pushUndo();
      setDocument({
        ...doc,
        pages: doc.pages.map(p =>
          p.id === editingPageId ? { ...p, name: trimmed } : p,
        ),
      });
    }
    setEditingPageId(null);
  }, [editingPageId, editingName, doc, pushUndo, setDocument]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        commitRename();
      } else if (e.key === 'Escape') {
        setEditingPageId(null);
      }
    },
    [commitRename],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, pageId: string) => {
      e.preventDefault();
      setContextMenu({ pageId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleAddPage = useCallback(() => {
    pushUndo();
    const pageNum = doc.pages.length + 1;
    const updated = addPage(doc, `Page ${pageNum}`);
    // Set the new page as active
    const newPage = updated.pages[updated.pages.length - 1];
    if (newPage) {
      setDocument(setActivePage(updated, newPage.id));
    } else {
      setDocument(updated);
    }
  }, [doc, pushUndo, setDocument]);

  const handleDeletePage = useCallback(
    (pageId: string) => {
      if (doc.pages.length <= 1) return;
      pushUndo();
      setDocument(removePage(doc, pageId));
      setContextMenu(null);
    },
    [doc, pushUndo, setDocument],
  );

  return (
    <>
      <div className={styles.tabBar} data-component="artboard-tabs" role="tablist">
        {doc.pages.map(page => {
          const isActive = page.id === doc.activePageId;
          const isEditing = page.id === editingPageId;

          return (
            <button
              key={page.id}
              role="tab"
              aria-selected={isActive}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onClick={() => handleTabClick(page.id)}
              onDoubleClick={() => handleDoubleClick(page)}
              onContextMenu={e => handleContextMenu(e, page.id)}
              data-page-id={page.id}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={styles.tabInput}
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  onClick={e => e.stopPropagation()}
                  data-field="page-name"
                />
              ) : (
                page.name
              )}
            </button>
          );
        })}
        <button
          className={styles.addButton}
          onClick={handleAddPage}
          aria-label="Add page"
          title="Add page"
        >
          +
        </button>
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          data-component="page-context-menu"
        >
          <button
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleDeletePage(contextMenu.pageId)}
            disabled={doc.pages.length <= 1}
          >
            Delete Page
          </button>
        </div>
      )}
    </>
  );
}
