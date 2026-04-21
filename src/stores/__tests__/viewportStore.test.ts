import { useViewportStore, computeAutoFitZoom } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

beforeEach(() => {
  useDocumentStore.setState({
    document: createEmptyDocument(),
    undoStack: [],
    redoStack: [],
  });
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
    autoFitEnabled: true,
    viewportWidth: 0,
    viewportHeight: 0,
    cursorGridPos: null,
  });
});

describe('viewportStore', () => {
  describe('zoom clamping', () => {
    it('clamps zoom to minimum 0.1', () => {
      useViewportStore.getState().setZoom(-1);
      expect(useViewportStore.getState().zoom).toBe(0.1);
    });

    it('clamps zoom to maximum 5', () => {
      useViewportStore.getState().setZoom(10);
      expect(useViewportStore.getState().zoom).toBe(5);
    });

    it('allows zoom within range', () => {
      useViewportStore.getState().setZoom(2.5);
      expect(useViewportStore.getState().zoom).toBe(2.5);
    });
  });

  describe('zoomAtPoint', () => {
    it('keeps cursor position stable under zoom in', () => {
      // Start at zoom=1, pan=(0,0)
      // Canvas rect at (100, 50) with size 800x600
      const canvasRect = { left: 100, top: 50, right: 900, bottom: 650 } as DOMRect;
      const clientX = 500; // 400px into canvas
      const clientY = 350; // 300px into canvas

      // Zoom in by 0.5 (from 1 to 1.5)
      useViewportStore.getState().zoomAtPoint(0.5, clientX, clientY, canvasRect);

      const state = useViewportStore.getState();
      expect(state.zoom).toBe(1.5);

      // The point under cursor should remain at the same client position
      // Before zoom: point in content space = clientX - canvasRect.left - panX = 400
      // After zoom: clientX - canvasRect.left - newPanX should equal old content position * ratio
      // Verify pan was adjusted (non-zero since zoom != 1)
      // newPanX = relX - (relX - oldPanX) * (newZoom / oldZoom)
      // relX = clientX - canvasRect.left = 400
      // = 400 - (400 - 0) * (1.5 / 1) = 400 - 600 = -200
      expect(state.panX).toBeCloseTo(-200);
      // relY = clientY - canvasRect.top = 300
      // newPanY = 300 - 300 * 1.5 = 300 - 450 = -150
      expect(state.panY).toBeCloseTo(-150);
    });

    it('clamps zoom delta to valid range', () => {
      useViewportStore.getState().setZoom(4.9);
      const canvasRect = { left: 0, top: 0 } as DOMRect;
      useViewportStore.getState().zoomAtPoint(1, 100, 100, canvasRect);
      expect(useViewportStore.getState().zoom).toBe(5);
    });

    it('handles zoom out at point', () => {
      useViewportStore.getState().setZoom(2);
      const canvasRect = { left: 0, top: 0 } as DOMRect;
      useViewportStore.getState().zoomAtPoint(-0.5, 200, 200, canvasRect);

      const state = useViewportStore.getState();
      expect(state.zoom).toBe(1.5);
    });
  });

  describe('getEffectiveGridConfig', () => {
    it('returns base config at zoom 1', () => {
      const config = useViewportStore.getState().getEffectiveGridConfig();
      expect(config.fontSize).toBe(14);
      expect(config.fontFamily).toContain('IBM Plex Mono');
      expect(config.lineHeight).toBe(1.35);
    });

    it('scales font size with zoom', () => {
      useViewportStore.getState().setZoom(2);
      const config = useViewportStore.getState().getEffectiveGridConfig();
      expect(config.fontSize).toBe(28);
    });

    it('preserves canvasCols and canvasRows from default', () => {
      const config = useViewportStore.getState().getEffectiveGridConfig();
      expect(config.canvasCols).toBe(228);
      expect(config.canvasRows).toBe(57);
    });

    it('reflects active page canvas overrides', () => {
      const doc = createEmptyDocument();
      const page = doc.pages[0]!;
      useDocumentStore.setState({
        document: {
          ...doc,
          pages: [
            {
              ...page,
              canvasColsOverride: 300,
              canvasRowsOverride: 80,
            },
          ],
        },
        undoStack: [],
        redoStack: [],
      });

      const config = useViewportStore.getState().getEffectiveGridConfig();
      expect(config.canvasCols).toBe(300);
      expect(config.canvasRows).toBe(80);
    });

    it('returns a stable config object when unrelated viewport state changes', () => {
      const config1 = useViewportStore.getState().getEffectiveGridConfig();

      useViewportStore.getState().setCursorGridPos({ col: 10, row: 5 });

      const config2 = useViewportStore.getState().getEffectiveGridConfig();
      expect(config2).toBe(config1);
    });
  });


  describe('cursor grid position', () => {
    it('sets and clears cursor position', () => {
      useViewportStore.getState().setCursorGridPos({ col: 10, row: 5 });
      expect(useViewportStore.getState().cursorGridPos).toEqual({ col: 10, row: 5 });

      useViewportStore.getState().setCursorGridPos(null);
      expect(useViewportStore.getState().cursorGridPos).toBeNull();
    });
  });

  describe('computeAutoFitZoom', () => {
    it('returns null for zero viewport dimensions', () => {
      expect(computeAutoFitZoom(0, 0, 100, 50, 8.4, 18.9, 0, 0)).toBeNull();
      expect(computeAutoFitZoom(800, 0, 100, 50, 8.4, 18.9, 0, 0)).toBeNull();
      expect(computeAutoFitZoom(0, 600, 100, 50, 8.4, 18.9, 0, 0)).toBeNull();
    });

    it('returns null for zero page dimensions', () => {
      expect(computeAutoFitZoom(800, 600, 0, 50, 8.4, 18.9, 0, 0)).toBeNull();
      expect(computeAutoFitZoom(800, 600, 100, 0, 8.4, 18.9, 0, 0)).toBeNull();
    });

    it('fits width-constrained canvas with buffer', () => {
      // 100 cols * 8.4 = 840px page width, viewport = 840px
      // buffer 0.9 → zoom = (840 * 0.9) / 840 = 0.9
      const result = computeAutoFitZoom(840, 2000, 100, 10, 8.4, 18.9, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.zoom).toBeCloseTo(0.9, 2);
    });

    it('fits height-constrained canvas with buffer', () => {
      // 50 rows * 18.9 = 945px page height, viewport = 945px
      // buffer 0.9 → zoom = (945 * 0.9) / 945 = 0.9
      const result = computeAutoFitZoom(5000, 945, 10, 50, 8.4, 18.9, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.zoom).toBeCloseTo(0.9, 2);
    });

    it('centers the canvas in the viewport', () => {
      // viewport 1000x1000, page 100x100 cells, cellW=5, cellH=5
      // pagePixels = 500x500, buffer 0.9 → zoom = 0.9*1000/500 = 1.8
      // effectiveCellW = 5*1.8 = 9, pagePx = 100*9 = 900
      // panX = (1000 - 900) / 2 = 50
      const result = computeAutoFitZoom(1000, 1000, 100, 100, 5, 5, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.zoom).toBeCloseTo(1.8, 2);
      expect(result!.panX).toBeCloseTo(50, 1);
      expect(result!.panY).toBeCloseTo(50, 1);
    });

    it('accounts for page offset in centering', () => {
      // Same as above but with canvasX=10
      const result = computeAutoFitZoom(1000, 1000, 100, 100, 5, 5, 10, 0);
      expect(result).not.toBeNull();
      // panX = (1000 - 900) / 2 - 10 * 9 = 50 - 90 = -40
      expect(result!.panX).toBeCloseTo(-40, 1);
    });

    it('clamps zoom to valid range', () => {
      // Tiny viewport + large page → zoom would be very small
      const result = computeAutoFitZoom(10, 10, 1000, 1000, 8.4, 18.9, 0, 0);
      expect(result).not.toBeNull();
      expect(result!.zoom).toBe(0.1);

      // Huge viewport + tiny page → zoom would be very large
      const result2 = computeAutoFitZoom(10000, 10000, 1, 1, 8.4, 18.9, 0, 0);
      expect(result2).not.toBeNull();
      expect(result2!.zoom).toBe(5);
    });
  });

  describe('auto-fit mode', () => {
    it('defaults to autoFitEnabled true', () => {
      expect(useViewportStore.getState().autoFitEnabled).toBe(true);
    });

    it('setZoom disables auto-fit when far from fit zoom', () => {
      useViewportStore.setState({ viewportWidth: 800, viewportHeight: 600 });
      useViewportStore.getState().setZoom(3);
      expect(useViewportStore.getState().autoFitEnabled).toBe(false);
    });

    it('setZoom snaps to auto-fit and re-enables when near fit zoom', () => {
      // Set up known viewport dimensions so auto-fit computes a known zoom
      useViewportStore.setState({
        viewportWidth: 800,
        viewportHeight: 600,
        autoFitEnabled: false,
      });
      // First, find what auto-fit zoom would be
      useViewportStore.getState().setAutoFitEnabled(true);
      const fitZoom = useViewportStore.getState().zoom;
      // Disable auto-fit and set a manual zoom
      useViewportStore.setState({ autoFitEnabled: false, zoom: 2 });

      // Now setZoom to a value within 8% of fit zoom — should snap
      const nearFit = fitZoom * 1.05; // 5% above fit, within 8% threshold
      useViewportStore.getState().setZoom(nearFit);
      expect(useViewportStore.getState().autoFitEnabled).toBe(true);
      expect(useViewportStore.getState().zoom).toBe(fitZoom);
    });

    it('setZoom does NOT snap when zoom is far below fit zoom', () => {
      useViewportStore.setState({
        viewportWidth: 800,
        viewportHeight: 600,
        autoFitEnabled: false,
      });
      // Get the fit zoom for reference
      useViewportStore.getState().setAutoFitEnabled(true);
      const fitZoom = useViewportStore.getState().zoom;
      useViewportStore.setState({ autoFitEnabled: false, zoom: 2 });

      // Zoom to half of fit — well outside 8% threshold
      useViewportStore.getState().setZoom(fitZoom * 0.5);
      expect(useViewportStore.getState().autoFitEnabled).toBe(false);
      expect(useViewportStore.getState().zoom).not.toBe(fitZoom);
    });

    it('setPan disables auto-fit', () => {
      useViewportStore.getState().setPan(100, 200);
      expect(useViewportStore.getState().autoFitEnabled).toBe(false);
    });

    it('resetView disables auto-fit', () => {
      useViewportStore.getState().resetView();
      expect(useViewportStore.getState().autoFitEnabled).toBe(false);
    });

    it('zoomAtPoint disables auto-fit', () => {
      const canvasRect = { left: 0, top: 0 } as DOMRect;
      useViewportStore.getState().zoomAtPoint(0.5, 100, 100, canvasRect);
      expect(useViewportStore.getState().autoFitEnabled).toBe(false);
    });

    it('setAutoFitEnabled(true) triggers applyAutoFit when dimensions known', () => {
      useViewportStore.setState({
        autoFitEnabled: false,
        viewportWidth: 800,
        viewportHeight: 600,
      });
      const zoomBefore = useViewportStore.getState().zoom;
      useViewportStore.getState().setAutoFitEnabled(true);
      // Should have recalculated — zoom likely changed from 1
      expect(useViewportStore.getState().autoFitEnabled).toBe(true);
      // The fit zoom for the default page (228 cols * 8.4 = 1915px wide) in 800px
      // viewport would be much less than 1
      expect(useViewportStore.getState().zoom).toBeLessThan(zoomBefore);
    });
  });
});
