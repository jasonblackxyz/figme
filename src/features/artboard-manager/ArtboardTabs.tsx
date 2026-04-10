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
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Detect overflow for scroll arrows
  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateOverflow();
    el.addEventListener('scroll', updateOverflow);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOverflow) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      observer?.disconnect();
    };
  }, [updateOverflow, doc.pages.length]);

  const scrollTabs = useCallback((direction: number) => {
    scrollRef.current?.scrollBy({ left: direction * 120, behavior: 'smooth' });
  }, []);

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
      <div className={styles.tabBarWrapper}>
        {showLeftArrow && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowLeft}`}
            onClick={() => scrollTabs(-1)}
            aria-label="Scroll tabs left"
          >
            {'\u2039'}
          </button>
        )}
        <div ref={scrollRef} className={styles.tabBar} data-component="artboard-tabs" role="tablist">
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
        {showRightArrow && (
          <button
            className={`${styles.scrollArrow} ${styles.scrollArrowRight}`}
            onClick={() => scrollTabs(1)}
            aria-label="Scroll tabs right"
          >
            {'\u203A'}
          </button>
        )}
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
