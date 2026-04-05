import { useState, useMemo } from 'react';
import { createCharRegistry, CHAR_CATALOG } from '@primitives/char-registry/catalog.ts';
import type { CharCategory } from '@primitives/char-registry/types.ts';
import styles from './CharPicker.module.css';

interface Props {
  onSelect: (char: string) => void;
  visible: boolean;
  onClose: () => void;
}

export function CharPicker({ onSelect, visible, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CharCategory | 'all'>('all');

  const registry = useMemo(() => createCharRegistry(), []);

  if (!visible) return null;

  const filteredChars = searchQuery
    ? registry.search(searchQuery)
    : activeCategory === 'all'
      ? CHAR_CATALOG
      : CHAR_CATALOG.filter(c => c.category === activeCategory);

  const categories: Array<CharCategory | 'all'> = [
    'all',
    'box-drawing',
    'box-double',
    'block-elements',
    'arrows',
    'geometric',
    'mathematical',
    'dingbats',
    'technical',
    'punctuation-extended',
    'braille',
    'custom',
  ];

  return (
    <div className={styles.picker} data-component="char-picker">
      <div className={styles.header}>
        <h3 className={styles.title}>Characters</h3>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">&times;</button>
      </div>
      <input
        className={styles.search}
        type="text"
        placeholder="Search characters..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        data-input="char-search"
      />
      <div className={styles.categories}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`${styles.categoryButton} ${activeCategory === cat ? styles.categoryActive : ''}`}
            onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className={styles.charGrid}>
        {filteredChars.map(entry => (
          <button
            key={entry.char}
            className={styles.charButton}
            onClick={() => onSelect(entry.char)}
            title={entry.name}
            data-char={entry.char}
          >
            {entry.char}
          </button>
        ))}
      </div>
    </div>
  );
}
