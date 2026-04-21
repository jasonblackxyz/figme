import { create } from 'zustand';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { measureCellDimensions } from '@primitives/grid-engine/measurement.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import { useDocumentStore } from '@stores/documentStore.ts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Cache measured cell dimensions by font family, size, and line height. */
const measuredCellCache = new Map<string, { cellWidth: number; cellHeight: number }>();

/**
 * Pure function: compute zoom + centered pan so the artboard fits the viewport.
 * Returns null if viewport or page dimensions are zero.
 */
export function computeAutoFitZoom(
  viewportWidth: number,
  viewportHeight: number,
  canvasCols: number,
  canvasRows: number,
  baseCellWidth: number,
  baseCellHeight: number,
  canvasX: number,
  canvasY: number,
  buffer = 0.9,
): { zoom: number; panX: number; panY: number } | null {
  if (viewportWidth <= 0 || viewportHeight <= 0) return null;

  const pagePixelWidth = canvasCols * baseCellWidth;
  const pagePixelHeight = canvasRows * baseCellHeight;
  if (pagePixelWidth <= 0 || pagePixelHeight <= 0) return null;

  const zoom = clamp(
    Math.min(
      (viewportWidth * buffer) / pagePixelWidth,
      (viewportHeight * buffer) / pagePixelHeight,
    ),
    0.1,
    5,
  );

  // Approximate effective cell dimensions at this zoom level
  const effectiveCellWidth = baseCellWidth * zoom;
  const effectiveCellHeight = baseCellHeight * zoom;

  // Center the artboard in the viewport
  const panX = (viewportWidth - canvasCols * effectiveCellWidth) / 2 - canvasX * effectiveCellWidth;
  const panY = (viewportHeight - canvasRows * effectiveCellHeight) / 2 - canvasY * effectiveCellHeight;

  return { zoom, panX, panY };
}

/** Read current page dims from the document store and compute auto-fit. */
function currentAutoFit(viewportWidth: number, viewportHeight: number) {
  const doc = useDocumentStore.getState().document;
  const page = doc.pages.find(p => p.id === doc.activePageId);
  if (!page) return null;
  const base = doc.gridConfig;
  const { effectiveCols, effectiveRows } = getPageCanvasSizeInfo(page, base);
  const { cellWidth, cellHeight } = measureCellDimensions(
    base.fontFamily,
    base.fontSize,
    base.lineHeight,
  );
  return computeAutoFitZoom(
    viewportWidth, viewportHeight,
    effectiveCols, effectiveRows,
    cellWidth, cellHeight,
    page.canvasX, page.canvasY,
  );
}

const SNAP_THRESHOLD = 0.08; // 8% — within the user's "5-10%" spec

interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  autoFitEnabled: boolean;
  viewportWidth: number;
  viewportHeight: number;
  cursorGridPos: { col: number; row: number } | null;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setAutoFitEnabled: (enabled: boolean) => void;
  setViewportDimensions: (w: number, h: number) => void;
  applyAutoFit: () => void;
  setCursorGridPos: (pos: { col: number; row: number } | null) => void;
  zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => void;
  getEffectiveGridConfig: () => GridConfig;
}

export const useViewportStore = create<ViewportState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  autoFitEnabled: true,
  viewportWidth: 0,
  viewportHeight: 0,
  cursorGridPos: null,

  setZoom: (zoom: number) => {
    const newZoom = clamp(zoom, 0.1, 5);
    const { viewportWidth, viewportHeight } = get();
    const fit = currentAutoFit(viewportWidth, viewportHeight);

    // Snap-back: if the new zoom is close to auto-fit, snap to it
    if (fit && Math.abs(newZoom - fit.zoom) / fit.zoom < SNAP_THRESHOLD) {
      set({ zoom: fit.zoom, panX: fit.panX, panY: fit.panY, autoFitEnabled: true });
      return;
    }

    set({ zoom: newZoom, autoFitEnabled: false });
  },

  setPan: (x: number, y: number) => set({ panX: x, panY: y, autoFitEnabled: false }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0, autoFitEnabled: false }),

  setAutoFitEnabled: (enabled: boolean) => {
    set({ autoFitEnabled: enabled });
    if (enabled && get().viewportWidth > 0) {
      get().applyAutoFit();
    }
  },

  setViewportDimensions: (w: number, h: number) => {
    set({ viewportWidth: w, viewportHeight: h });
    if (get().autoFitEnabled && w > 0 && h > 0) {
      get().applyAutoFit();
    }
  },

  applyAutoFit: () => {
    const { viewportWidth, viewportHeight } = get();
    const result = currentAutoFit(viewportWidth, viewportHeight);
    if (result) {
      // Direct set — bypasses setZoom/setPan disengage logic
      set({ zoom: result.zoom, panX: result.panX, panY: result.panY });
    }
  },

  setCursorGridPos: (pos: { col: number; row: number } | null) => set({ cursorGridPos: pos }),

  zoomAtPoint: (delta: number, clientX: number, clientY: number, canvasRect: DOMRect) => {
    const oldZoom = get().zoom;
    const newZoom = clamp(oldZoom + delta, 0.1, 5);
    const relX = clientX - canvasRect.left;
    const relY = clientY - canvasRect.top;
    const newPanX = relX - (relX - get().panX) * (newZoom / oldZoom);
    const newPanY = relY - (relY - get().panY) * (newZoom / oldZoom);
    // No snap-back for cursor-anchored zoom — the pan jump would be jarring
    set({ zoom: newZoom, panX: newPanX, panY: newPanY, autoFitEnabled: false });
  },

  getEffectiveGridConfig: () => {
    const { zoom } = get();
    const doc = useDocumentStore.getState().document;
    const page = doc.pages.find(p => p.id === doc.activePageId);
    const base = doc.gridConfig;
    const effectiveFontSize = Math.round(base.fontSize * zoom * 100) / 100;
    const cacheKey = `${base.fontFamily}::${base.lineHeight}::${effectiveFontSize}`;

    let measured = measuredCellCache.get(cacheKey);
    if (!measured) {
      measured = measureCellDimensions(
        base.fontFamily,
        effectiveFontSize,
        base.lineHeight,
      );
      measuredCellCache.set(cacheKey, measured);
    }

    const pageCanvas = page ? getPageCanvasSizeInfo(page, base) : null;
    return {
      ...base,
      fontSize: effectiveFontSize,
      cellWidth: measured.cellWidth,
      cellHeight: measured.cellHeight,
      canvasCols: pageCanvas?.effectiveCols ?? base.canvasCols,
      canvasRows: pageCanvas?.effectiveRows ?? base.canvasRows,
    };
  },
}));
