import { useCallback, useRef, useEffect } from 'react';
import type { GridConfig, GridPosition } from '@primitives/grid-engine/types.ts';
import { pixelToGrid } from '@primitives/grid-engine/coordinates.ts';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import { getToolHandler } from '@features/tools/toolRegistry.ts';
import { handTool } from '@features/tools/handTool.ts';

export function clientToGrid(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  panX: number,
  panY: number,
  gridConfig: GridConfig,
): GridPosition {
  const x = clientX - canvasRect.left - panX;
  const y = clientY - canvasRect.top - panY;
  return pixelToGrid({ x, y }, gridConfig);
}

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const spaceHeldRef = useRef(false);
  const isSpaceDraggingRef = useRef(false);

  // Track space key for temporary hand tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        if (isSpaceDraggingRef.current) {
          isSpaceDraggingRef.current = false;
          handTool.onPointerUp({ col: 0, row: 0 }, e as unknown as PointerEvent);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportState = useViewportStore.getState();
      const gridConfig = viewportState.getEffectiveGridConfig();
      const gridPos = clientToGrid(event.clientX, event.clientY, rect, viewportState.panX, viewportState.panY, gridConfig);

      // Space+drag or middle button -> hand tool
      if (spaceHeldRef.current || event.button === 1) {
        isSpaceDraggingRef.current = true;
        handTool.onPointerDown(gridPos, event.nativeEvent);
        return;
      }

      const tool = useToolStore.getState().activeTool;
      const handler = getToolHandler(tool);
      handler.onPointerDown(gridPos, event.nativeEvent);

      el.setPointerCapture(event.pointerId);
    },
    [canvasRef],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportState = useViewportStore.getState();
      const gridConfig = viewportState.getEffectiveGridConfig();
      const gridPos = clientToGrid(event.clientX, event.clientY, rect, viewportState.panX, viewportState.panY, gridConfig);

      // Update cursor position in viewport store
      viewportState.setCursorGridPos(gridPos);

      if (isSpaceDraggingRef.current) {
        handTool.onPointerMove(gridPos, event.nativeEvent);
        return;
      }

      const tool = useToolStore.getState().activeTool;
      const handler = getToolHandler(tool);
      handler.onPointerMove(gridPos, event.nativeEvent);
    },
    [canvasRef],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportState = useViewportStore.getState();
      const gridConfig = viewportState.getEffectiveGridConfig();
      const gridPos = clientToGrid(event.clientX, event.clientY, rect, viewportState.panX, viewportState.panY, gridConfig);

      if (isSpaceDraggingRef.current) {
        isSpaceDraggingRef.current = false;
        handTool.onPointerUp(gridPos, event.nativeEvent);
        return;
      }

      const tool = useToolStore.getState().activeTool;
      const handler = getToolHandler(tool);
      handler.onPointerUp(gridPos, event.nativeEvent);

      el.releasePointerCapture(event.pointerId);
    },
    [canvasRef],
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportState = useViewportStore.getState();
      const gridConfig = viewportState.getEffectiveGridConfig();
      const gridPos = clientToGrid(event.clientX, event.clientY, rect, viewportState.panX, viewportState.panY, gridConfig);

      const tool = useToolStore.getState().activeTool;
      const handler = getToolHandler(tool);
      handler.onDoubleClick?.(gridPos, event.nativeEvent);
    },
    [canvasRef],
  );

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const viewportState = useViewportStore.getState();

      if (event.ctrlKey || event.metaKey) {
        // Zoom at point
        const delta = -event.deltaY * 0.01;
        viewportState.zoomAtPoint(delta, event.clientX, event.clientY, rect);
      } else {
        // Pan
        const newPanX = viewportState.panX - event.deltaX;
        const newPanY = viewportState.panY - event.deltaY;
        viewportState.setPan(newPanX, newPanY);
      }
    },
    [canvasRef],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onDoubleClick, onWheel };
}
