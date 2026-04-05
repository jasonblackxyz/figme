import { create } from 'zustand';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { measureCellDimensions, createDefaultGridConfig } from '@primitives/grid-engine/measurement.ts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Cache for effective grid configs keyed by effective font size */
const gridConfigCache = new Map<number, GridConfig>();

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  cursorGridPos: { col: number; row: number } | null;
  gridOverlayVisible: boolean;
  rulersVisible: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setCursorGridPos: (pos: { col: number; row: number } | null) => void;
  toggleGridOverlay: () => void;
  toggleRulers: () => void;
  zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  getEffectiveGridConfig: () => GridConfig;
}

export const useViewportStore = create<ViewportState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  cursorGridPos: null,
  gridOverlayVisible: false,
  rulersVisible: true,

  setZoom: (zoom: number) => set({ zoom: clamp(zoom, 0.1, 5) }),
  setPan: (x: number, y: number) => set({ panX: x, panY: y }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setCursorGridPos: (pos: { col: number; row: number } | null) => set({ cursorGridPos: pos }),
  toggleGridOverlay: () => set((s) => ({ gridOverlayVisible: !s.gridOverlayVisible })),
  toggleRulers: () => set((s) => ({ rulersVisible: !s.rulersVisible })),

  zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => {
    const oldZoom = get().zoom;
    const newZoom = clamp(oldZoom + delta, 0.1, 5);
    const relX = clientX - canvasRect.left;
    const relY = clientY - canvasRect.top;
    const newPanX = relX - (relX - get().panX) * (newZoom / oldZoom);
    const newPanY = relY - (relY - get().panY) * (newZoom / oldZoom);
    set({ zoom: newZoom, panX: newPanX, panY: newPanY });
  },

  getEffectiveGridConfig: () => {
    const { zoom } = get();
    const base = createDefaultGridConfig();
    const effectiveFontSize = Math.round(base.fontSize * zoom * 100) / 100;

    const cached = gridConfigCache.get(effectiveFontSize);
    if (cached) return cached;

    const { cellWidth, cellHeight } = measureCellDimensions(
      base.fontFamily,
      effectiveFontSize,
      base.lineHeight,
    );

    const config: GridConfig = {
      ...base,
      fontSize: effectiveFontSize,
      cellWidth,
      cellHeight,
    };

    gridConfigCache.set(effectiveFontSize, config);
    return config;
  },
}));
