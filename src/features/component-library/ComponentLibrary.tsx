import { useDocumentStore } from '@stores/documentStore.ts';
import styles from './ComponentLibrary.module.css';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ComponentLibrary({ visible, onClose }: Props) {
  const doc = useDocumentStore(s => s.document);
  const components = Object.values(doc.components);

  if (!visible) return null;

  return (
    <div className={styles.library} data-component="component-library">
      <div className={styles.header}>
        <h3 className={styles.title}>Components</h3>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">&times;</button>
      </div>
      <div className={styles.list}>
        {components.length === 0 ? (
          <div className={styles.empty}>No components defined yet</div>
        ) : (
          components.map(comp => (
            <div key={comp.id} className={styles.item} data-component-id={comp.id}>
              <span className={styles.name}>{comp.name}</span>
              <span className={styles.description}>{comp.description}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
