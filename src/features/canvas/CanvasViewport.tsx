import { useRef } from 'react';
import { GridRenderer } from '@renderer/GridRenderer.tsx';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useComposedBuffer } from '@hooks/useComposedBuffer.ts';
import { useCanvasInteraction } from './useCanvasInteraction.ts';
import { SelectionOverlay } from './SelectionOverlay.tsx';
import { DrawingPreview } from './DrawingPreview.tsx';
import { ArtboardFrame } from './ArtboardFrame.tsx';
import { Rulers } from './Rulers.tsx';
import { GridOverlay } from './GridOverlay.tsx';
import { TextEditor } from '@features/text-editor/TextEditor.tsx';
import { SmartGuides } from '@features/smart-guides/SmartGuides.tsx';
import { getToolHandler } from '@features/tools/toolRegistry.ts';
import styles from './CanvasViewport.module.css';

export function CanvasViewport() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp, onWheel } = useCanvasInteraction(canvasRef);

  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const gridConfig = useViewportStore((s) => s.getEffectiveGridConfig());
  const gridOverlayVisible = useViewportStore((s) => s.gridOverlayVisible);
  const rulersVisible = useViewportStore((s) => s.rulersVisible);
  const zoom = useViewportStore((s) => s.zoom);

  const doc = useDocumentStore((s) => s.document);
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];

  const activeTool = useToolStore((s) => s.activeTool);
  const toolHandler = getToolHandler(activeTool);

  const buffer = useComposedBuffer(activePage!, gridConfig);

  return (
    <div
      ref={canvasRef}
      className={styles.viewport}
      style={{ cursor: toolHandler.cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      data-testid="canvas-viewport"
    >
      {rulersVisible && (
        <Rulers gridConfig={gridConfig} panX={panX} panY={panY} />
      )}
      <div
        className={styles.canvasInner}
        style={{ transform: `translate(${panX}px, ${panY}px)` }}
      >
        {activePage && (
          <ArtboardFrame
            page={activePage}
            gridConfig={gridConfig}
          />
        )}
        <GridRenderer buffer={buffer} palette={doc.palette} gridConfig={gridConfig} />
        {gridOverlayVisible && zoom > 0.5 && (
          <GridOverlay gridConfig={gridConfig} />
        )}
      </div>
      <div className={styles.overlay}>
        <SelectionOverlay gridConfig={gridConfig} panX={panX} panY={panY} />
        <DrawingPreview />
        <TextEditor />
        <SmartGuides />
      </div>
    </div>
  );
}
