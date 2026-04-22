import type { FigMePage } from '@primitives/document-model/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { getResolvedPageBackgroundColor } from '@primitives/document-model/pageBackground.ts';
import styles from './ArtboardFrame.module.css';

interface ArtboardFrameProps {
  page: FigMePage;
  gridConfig: GridConfig;
}

export function ArtboardFrame({ page, gridConfig }: ArtboardFrameProps) {
  const x = page.canvasX * gridConfig.cellWidth;
  const y = page.canvasY * gridConfig.cellHeight;
  const width = gridConfig.canvasCols * gridConfig.cellWidth;
  const height = gridConfig.canvasRows * gridConfig.cellHeight;
  const backgroundColor = getResolvedPageBackgroundColor(page);

  return (
    <>
      <div
        className={styles.label}
        style={{
          left: x,
          top: y - 18,
        }}
      >
        {page.name}
      </div>
      <div
        className={styles.background}
        style={{
          left: x,
          top: y,
          width,
          height,
          backgroundColor,
        }}
      />
      <div
        className={styles.frame}
        data-testid="artboard-frame"
        style={{
          left: x,
          top: y,
          width,
          height,
        }}
      />
    </>
  );
}
