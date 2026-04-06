import { useViewportStore } from '@stores/viewportStore.ts';

beforeEach(() => {
  useViewportStore.setState({
    zoom: 1,
    panX: 0,
    panY: 0,
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

    it('caches config for same effective font size', () => {
      useViewportStore.getState().setZoom(1.5);
      const config1 = useViewportStore.getState().getEffectiveGridConfig();
      const config2 = useViewportStore.getState().getEffectiveGridConfig();
      expect(config1).toBe(config2); // Same reference = cached
    });

    it('preserves canvasCols and canvasRows from default', () => {
      const config = useViewportStore.getState().getEffectiveGridConfig();
      expect(config.canvasCols).toBeGreaterThan(0);
      expect(config.canvasRows).toBeGreaterThan(0);
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
});
