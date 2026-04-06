import { useState, useRef, useEffect, useMemo } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { extractDocumentColors } from '@primitives/color-utils/conversions.ts';
import styles from './ColorPicker.module.css';

interface Props {
  currentColor: string;
  onSelect: (hex: string) => void;
}

export function SwatchPanel({ currentColor, onSelect }: Props) {
  const doc = useDocumentStore((s) => s.document);
  const addSwatchCollection = useDocumentStore((s) => s.addSwatchCollection);
  const addColorToCollection = useDocumentStore((s) => s.addColorToCollection);
  const removeColorFromCollection = useDocumentStore((s) => s.removeColorFromCollection);
  const removeSwatchCollection = useDocumentStore((s) => s.removeSwatchCollection);
  const renameSwatchCollection = useDocumentStore((s) => s.renameSwatchCollection);

  const activePage = doc.pages.find(p => p.id === doc.activePageId);
  const documentColors = useMemo(
    () => activePage ? extractDocumentColors(activePage, doc.palette) : [],
    [activePage, doc.palette],
  );

  const collections = doc.swatchCollections ?? [];
  const [activeTab, setActiveTab] = useState<string>('document');
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Center the active tab on change
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, [activeTab]);

  const activeColors = activeTab === 'document'
    ? documentColors
    : collections.find(c => c.id === activeTab)?.colors ?? [];

  const handleSave = (collectionId: string) => {
    addColorToCollection(collectionId, currentColor);
    setShowSaveMenu(false);
  };

  const handleCreateAndSave = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    addSwatchCollection(name);
    // The new collection will be the last one after state updates
    setNewCollectionName('');
    setShowSaveMenu(false);
    // We need to add the color after creation — use a microtask to let the store update
    queueMicrotask(() => {
      const latestDoc = useDocumentStore.getState().document;
      const latest = latestDoc.swatchCollections;
      const newCol = latest?.[latest.length - 1];
      if (newCol) {
        addColorToCollection(newCol.id, currentColor);
        setActiveTab(newCol.id);
      }
    });
  };

  const handleStartRename = (collectionId: string, name: string) => {
    setEditingCollectionId(collectionId);
    setEditName(name);
  };

  const handleCommitRename = () => {
    if (editingCollectionId && editName.trim()) {
      renameSwatchCollection(editingCollectionId, editName.trim());
    }
    setEditingCollectionId(null);
  };

  return (
    <div className={styles.swatchPanel}>
      {/* Tab bar */}
      <div className={styles.tabBarWrapper}>
        <div className={styles.tabBar} ref={tabsRef}>
          <button
            ref={activeTab === 'document' ? activeTabRef : undefined}
            className={`${styles.tab} ${activeTab === 'document' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('document')}
          >
            Document
          </button>
          {collections.map(c => (
            <button
              key={c.id}
              ref={activeTab === c.id ? activeTabRef : undefined}
              className={`${styles.tab} ${activeTab === c.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(c.id)}
              onDoubleClick={() => handleStartRename(c.id, c.name)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (confirm(`Delete collection "${c.name}"?`)) {
                  removeSwatchCollection(c.id);
                  if (activeTab === c.id) setActiveTab('document');
                }
              }}
            >
              {editingCollectionId === c.id ? (
                <input
                  className={styles.tabRenameInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleCommitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitRename();
                    if (e.key === 'Escape') setEditingCollectionId(null);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                c.name
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Swatch grid */}
      <div className={styles.swatchGrid}>
        {activeColors.length === 0 && (
          <span className={styles.swatchEmpty}>
            {activeTab === 'document' ? 'No colors in use' : 'No saved colors'}
          </span>
        )}
        {activeColors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            className={`${styles.swatch} ${color.toLowerCase() === currentColor.toLowerCase() ? styles.swatchSelected : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onSelect(color)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (activeTab !== 'document') {
                removeColorFromCollection(activeTab, i);
              }
            }}
            title={color}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>

      {/* Save button */}
      <div className={styles.saveRow}>
        <button
          className={styles.saveButton}
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          title="Save color to collection"
        >
          + Save
        </button>
        {showSaveMenu && (
          <div className={styles.saveMenu}>
            {collections.map(c => (
              <button
                key={c.id}
                className={styles.saveMenuItem}
                onClick={() => handleSave(c.id)}
              >
                {c.name}
              </button>
            ))}
            <div className={styles.saveNewRow}>
              <input
                className={styles.saveNewInput}
                placeholder="New collection..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndSave(); }}
                autoFocus
              />
              <button
                className={styles.saveNewButton}
                onClick={handleCreateAndSave}
                disabled={!newCollectionName.trim()}
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
