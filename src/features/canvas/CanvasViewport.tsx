import { useRef } from 'react';
import { GridRenderer } from '@renderer/GridRenderer.tsx';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useComposedBuffer } from '@hooks/useComposedBuffer.ts';
import { useCanvasInteraction } from './useCanvasInteraction.ts';
import { useAutoFit } from '@hooks/useAutoFit.ts';
import { SelectionOverlay } from './SelectionOverlay.tsx';
import { DrawingPreview } from './DrawingPreview.tsx';
import { ArtboardFrame } from './ArtboardFrame.tsx';
import { TextEditor } from '@features/text-editor/TextEditor.tsx';
import { SmartGuides } from '@features/smart-guides/SmartGuides.tsx';
import { RuntimeAnnotationOverlay } from '@features/export-prep/RuntimeAnnotationOverlay.tsx';
import { RegionOverlay } from '@features/region-labeling/RegionOverlay.tsx';
import { CanvasChrome } from '@features/region-labeling/CanvasChrome.tsx';
import { getToolHandler } from '@features/tools/toolRegistry.ts';
import styles from './CanvasViewport.module.css';

export function CanvasViewport() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onWheel } = useCanvasInteraction(canvasRef);
  useAutoFit(canvasRef);

  const panX = useViewportStore((s) => s.panX);
  const panY = useViewportStore((s) => s.panY);
  const gridConfig = useViewportStore((s) => s.getEffectiveGridConfig());
  const zoom = useViewportStore((s) => s.zoom);

  const doc = useDocumentStore((s) => s.document);
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];

  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds);

  const activeTool = useToolStore((s) => s.activeTool);
  const toolHandler = getToolHandler(activeTool);

  const { buffer, colorOverrides } = useComposedBuffer(activePage!, gridConfig);

  return (
    <div
      ref={canvasRef}
      className={styles.viewport}
      style={{ cursor: toolHandler.cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      data-testid="canvas-viewport"
    >
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
        <GridRenderer
          buffer={buffer}
          palette={doc.palette}
          gridConfig={gridConfig}
          selectedLayerIds={selectedLayerIds}
          zoom={zoom}
          scrollCol={Math.round(panX / gridConfig.cellWidth)}
          scrollRow={Math.round(panY / gridConfig.cellHeight)}
          colorOverrides={colorOverrides}
        />
      </div>
      <div className={styles.overlay}>
        <SelectionOverlay gridConfig={gridConfig} panX={panX} panY={panY} />
        <RuntimeAnnotationOverlay gridConfig={gridConfig} panX={panX} panY={panY} />
        <RegionOverlay gridConfig={gridConfig} panX={panX} panY={panY} />
        <DrawingPreview />
        <TextEditor />
        <SmartGuides />
      </div>
      <CanvasChrome />
    </div>
  );
}
