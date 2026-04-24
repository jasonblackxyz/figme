import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import styles from './RuntimeAnnotationOverlay.module.css';

interface RuntimeAnnotationOverlayProps {
  gridConfig: GridConfig;
  panX: number;
  panY: number;
}

export function RuntimeAnnotationOverlay({ gridConfig, panX, panY }: RuntimeAnnotationOverlayProps) {
  const doc = useDocumentStore((s) => s.document);
  const visible = useUiStore((s) => s.exportDialogOpen);
  const selectedId = useUiStore((s) => s.selectedRuntimeAnnotationId);
  const setSelected = useUiStore((s) => s.setSelectedRuntimeAnnotation);
  const activePage = doc.pages.find((page) => page.id === doc.activePageId);

  if (!visible || !activePage) return null;

  const annotations = Object.values(doc.runtime?.annotations ?? {})
    .filter((annotation) => annotation.pageId === activePage.id && annotation.export !== false);

  return (
    <>
      {annotations.map((annotation) => (
        <button
          key={annotation.id}
          type="button"
          className={`${styles.box} ${selectedId === annotation.id ? styles.selected : ''}`}
          style={{
            left: annotation.rect.col * gridConfig.cellWidth + panX,
            top: annotation.rect.row * gridConfig.cellHeight + panY,
            width: annotation.rect.width * gridConfig.cellWidth,
            height: annotation.rect.height * gridConfig.cellHeight,
          }}
          onClick={(event) => {
            event.stopPropagation();
            setSelected(annotation.id);
          }}
          aria-label={`Runtime annotation ${annotation.semanticId}`}
          data-runtime-annotation-id={annotation.id}
          data-semantic-id={annotation.semanticId}
        >
          <span className={styles.label}>{annotation.semanticId}</span>
        </button>
      ))}
    </>
  );
}
