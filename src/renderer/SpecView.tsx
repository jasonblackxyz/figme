import type { ReactNode } from 'react';
import type { FigmiiDocument } from '@primitives/document-model/types.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';

interface SpecViewProps {
  document: FigmiiDocument;
  selectedLayerIds: string[];
}

/**
 * Panel that renders a JSON specification of the current document state.
 * Designed for AI agent consumption — exposes the full design spec
 * as structured data that can be read from the DOM or accessibility tree.
 */
export function SpecView({ document, selectedLayerIds }: SpecViewProps): ReactNode {
  const activePage = document.pages.find((p) => p.id === document.activePageId);
  const activePageCanvas = activePage
    ? getPageCanvasSizeInfo(activePage, document.gridConfig)
    : null;

  const spec = {
    document: {
      name: document.name,
      activePageId: document.activePageId,
      pageCount: document.pages.length,
    },
    gridConfig: {
      fontFamily: document.gridConfig.fontFamily,
      fontSize: document.gridConfig.fontSize,
      cellWidth: document.gridConfig.cellWidth,
      cellHeight: document.gridConfig.cellHeight,
      canvasCols: document.gridConfig.canvasCols,
      canvasRows: document.gridConfig.canvasRows,
    },
    activePage: activePage
      ? {
          id: activePage.id,
          name: activePage.name,
          canvasSize: activePageCanvas,
          layerCount: Object.keys(activePage.layers).length,
          layers: flattenLayerOrder(activePage).map((id) => {
            const layer = activePage.layers[id];
            if (!layer) return null;
            return {
              id: layer.id,
              kind: layer.kind,
              name: layer.name,
              rect: layer.rect,
              styleKey: layer.styleKey,
              visible: layer.visible,
              locked: layer.locked,
              selected: selectedLayerIds.includes(layer.id),
            };
          }).filter(Boolean),
        }
      : null,
    components: Object.values(document.components).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
  };

  return (
    <div
      id="figmii-spec-view"
      role="region"
      aria-label="Specification View"
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '360px',
        overflow: 'auto',
        backgroundColor: 'var(--color-surface, #e8e8ee)',
        color: 'var(--color-text, #1a1a2e)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '12px',
        padding: '8px',
        zIndex: 1000,
        borderLeft: '1px solid var(--color-border, #c0c0cc)',
      }}
    >
      <pre>{JSON.stringify(spec, null, 2)}</pre>
    </div>
  );
}
