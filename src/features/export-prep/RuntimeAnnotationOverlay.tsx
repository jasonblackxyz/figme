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
  const selectedId = useUiStore((s) => s.selectedRegionId);
  const setSelected = useUiStore((s) => s.setSelectedRegion);
  const activePage = doc.pages.find((page) => page.id === doc.activePageId);

  if (!visible || !activePage) return null;

  const regions = Object.values(activePage.regions ?? {})
    .filter((region) => region.exportMode !== 'ignore');

  return (
    <>
      {regions.map((region) => (
        <button
          key={region.id}
          type="button"
          className={`${styles.box} ${selectedId === region.id ? styles.selected : ''}`}
          style={{
            left: region.shape.rect.col * gridConfig.cellWidth + panX,
            top: region.shape.rect.row * gridConfig.cellHeight + panY,
            width: region.shape.rect.width * gridConfig.cellWidth,
            height: region.shape.rect.height * gridConfig.cellHeight,
          }}
          onClick={(event) => {
            event.stopPropagation();
            setSelected(region.id);
          }}
          aria-label={`Runtime region ${region.semanticId ?? region.id}`}
          data-runtime-region-id={region.id}
          data-semantic-id={region.semanticId ?? region.id}
          data-component-kind={region.componentKind}
        >
          <span className={styles.label}>{region.semanticId ?? region.id}</span>
        </button>
      ))}
    </>
  );
}
