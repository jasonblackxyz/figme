import { useEffect, useRef } from 'react';
import { useViewportStore } from '@stores/viewportStore.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';

/**
 * Observes the canvas viewport element's size and the active page,
 * keeping the viewport store's auto-fit in sync.
 *
 * - ResizeObserver tracks available space (covers window resize + panel toggle).
 * - Active page changes re-trigger auto-fit when enabled.
 * - Uses requestAnimationFrame coalescing to avoid wasted renders during
 *   the 200ms CSS Grid panel transition.
 */
export function useAutoFit(canvasRef: React.RefObject<HTMLDivElement | null>): void {
  const rafIdRef = useRef<number | null>(null);

  // ResizeObserver → update viewport dimensions in store
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const setViewportDimensions = useViewportStore.getState().setViewportDimensions;

    const observer = new ResizeObserver((entries) => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        setViewportDimensions(width, height);
      });
    });

    observer.observe(el);

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      observer.disconnect();
    };
  }, [canvasRef]);

  // Re-trigger auto-fit when the active page or its effective size changes.
  const activePageCanvasKey = useDocumentStore((s) => {
    const activePage = s.document.pages.find((p) => p.id === s.document.activePageId);
    if (!activePage) return 'none';
    const canvas = getPageCanvasSizeInfo(activePage, s.document.gridConfig);
    return [
      activePage.id,
      canvas.effectiveCols,
      canvas.effectiveRows,
      activePage.canvasX,
      activePage.canvasY,
      s.document.gridConfig.fontFamily,
      s.document.gridConfig.fontSize,
      s.document.gridConfig.lineHeight,
    ].join(':');
  });
  useEffect(() => {
    const vs = useViewportStore.getState();
    if (vs.autoFitEnabled && vs.viewportWidth > 0) {
      vs.applyAutoFit();
    }
  }, [activePageCanvasKey]);
}
