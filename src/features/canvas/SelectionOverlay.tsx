import { useCallback } from 'react';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { updateLayer } from '@primitives/document-model/operations.ts';
import { isEffectivelyLocked } from '@primitives/document-model/hierarchy.ts';
import { HANDLES, computeResizeDragDelta, computeResizedRect } from './resizeHandles.ts';
import type { ResizeHandle } from './resizeHandles.ts';
import styles from './SelectionOverlay.module.css';

const HANDLE_POS_CLASS: Record<ResizeHandle, string> = {
  nw: styles.handleNw!,
  n: styles.handleN!,
  ne: styles.handleNe!,
  e: styles.handleE!,
  se: styles.handleSe!,
  s: styles.handleS!,
  sw: styles.handleSw!,
  w: styles.handleW!,
};

interface SelectionOverlayProps {
  gridConfig: GridConfig;
  panX: number;
  panY: number;
}

export function SelectionOverlay({ gridConfig, panX, panY }: SelectionOverlayProps) {
  const selectedLayerIds = useUiStore((s) => s.selectedLayerIds);
  const marqueeRect = useUiStore((s) => s.marqueeRect);
  const doc = useDocumentStore((s) => s.document);
  const page = doc.pages.find((p) => p.id === doc.activePageId);
  const selectedLayerId = selectedLayerIds.length === 1 ? selectedLayerIds[0]! : null;
  const selectedLayer = selectedLayerId && page ? page.layers[selectedLayerId] : null;

  const showHandles = Boolean(selectedLayer && selectedLayerId && page && !isEffectivelyLocked(page, selectedLayerId));

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, handle: ResizeHandle, layerId: string) => {
      e.stopPropagation();
      e.preventDefault();

      // Snapshot state at drag start
      const docState = useDocumentStore.getState();
      const viewportState = useViewportStore.getState();
      const currentGridConfig = viewportState.getEffectiveGridConfig();
      const currentPage = docState.document.pages.find(
        (p) => p.id === docState.document.activePageId,
      );
      const layer = currentPage?.layers[layerId];
      if (!layer || !currentPage || isEffectivelyLocked(currentPage, layerId)) return;

      const origRect: GridRect = { ...layer.rect };

      // Find the canvas viewport element for coordinate conversion
      const viewport = document.querySelector('[data-testid="canvas-viewport"]') as HTMLElement | null;
      if (!viewport) return;
      const canvasRect = viewport.getBoundingClientRect();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const startPointerPx = {
        x: e.clientX - canvasRect.left - viewportState.panX,
        y: e.clientY - canvasRect.top - viewportState.panY,
      };

      docState.pushUndo();

      const onMove = (me: PointerEvent) => {
        const currentPointerPx = {
          x: me.clientX - canvasRect.left - viewportState.panX,
          y: me.clientY - canvasRect.top - viewportState.panY,
        };
        const { deltaCol, deltaRow } = computeResizeDragDelta(
          origRect,
          handle,
          startPointerPx,
          currentPointerPx,
          currentGridConfig,
        );

        const newRect = computeResizedRect(origRect, handle, deltaCol, deltaRow);

        const ds = useDocumentStore.getState();
        const pg = ds.document.pages.find((p) => p.id === ds.document.activePageId);
        if (!pg) return;
        const currentLayer = pg.layers[layerId];
        if (!currentLayer || isEffectivelyLocked(pg, layerId)) return;

        const updatedPage = updateLayer(pg, layerId, { rect: newRect });
        const updatedDoc = {
          ...ds.document,
          pages: ds.document.pages.map((p) =>
            p.id === ds.document.activePageId ? updatedPage : p,
          ),
        };
        ds.setDocument(updatedDoc);
      };

      const cleanup = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', cleanup);
        el.removeEventListener('pointercancel', cleanup);
        el.removeEventListener('lostpointercapture', cleanup);
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', cleanup);
      el.addEventListener('pointercancel', cleanup);
      el.addEventListener('lostpointercapture', cleanup);
    },
    [],
  );

  return (
    <>
      {page &&
        selectedLayerIds.map((layerId) => {
          const layer = page.layers[layerId];
          if (!layer) return null;
          return (
            <div
              key={layerId}
              className={styles.selectionBox}
              data-testid={`selection-${layerId}`}
              style={{
                left: layer.rect.col * gridConfig.cellWidth + panX,
                top: layer.rect.row * gridConfig.cellHeight + panY,
                width: layer.rect.width * gridConfig.cellWidth,
                height: layer.rect.height * gridConfig.cellHeight,
              }}
            >
              {showHandles &&
                layerId === selectedLayerId &&
                HANDLES.map((h) => (
                  <div
                    key={h.key}
                    className={`${styles.handle} ${HANDLE_POS_CLASS[h.key]}`}
                    style={{ cursor: h.cursor }}
                    data-handle={h.key}
                    onPointerDown={(e) => onHandlePointerDown(e, h.key, layerId)}
                  />
                ))}
            </div>
          );
        })}
      {marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) && (
        <div
          className={styles.marquee}
          data-testid="marquee"
          style={{
            left: marqueeRect.col * gridConfig.cellWidth + panX,
            top: marqueeRect.row * gridConfig.cellHeight + panY,
            width: marqueeRect.width * gridConfig.cellWidth,
            height: marqueeRect.height * gridConfig.cellHeight,
          }}
        />
      )}
    </>
  );
}
