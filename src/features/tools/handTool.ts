import type { ToolHandler } from './types.ts';
import type { GridPosition } from '@primitives/grid-engine/types.ts';
import { useViewportStore } from '@stores/viewportStore.ts';

let isDragging = false;
let startClientX = 0;
let startClientY = 0;
let startPanX = 0;
let startPanY = 0;

export const handTool: ToolHandler = {
  cursor: 'grab',

  onPointerDown(_gridPos: GridPosition, event: PointerEvent) {
    isDragging = true;
    startClientX = event.clientX;
    startClientY = event.clientY;
    const state = useViewportStore.getState();
    startPanX = state.panX;
    startPanY = state.panY;
    // Change cursor to grabbing
    handTool.cursor = 'grabbing';
  },

  onPointerMove(_gridPos: GridPosition, event: PointerEvent) {
    if (!isDragging) return;
    const deltaX = event.clientX - startClientX;
    const deltaY = event.clientY - startClientY;
    useViewportStore.getState().setPan(startPanX + deltaX, startPanY + deltaY);
  },

  onPointerUp(_gridPos: GridPosition, _event: PointerEvent) {
    isDragging = false;
    handTool.cursor = 'grab';
  },
};
