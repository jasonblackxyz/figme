import type { ReactNode } from 'react';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';
import { renderGridToElements } from './renderGrid.ts';

interface GridRendererProps {
  buffer: StampBuffer;
  palette: Palette;
  gridConfig?: GridConfig;
  selectedLayerIds?: string[];
  zoom?: number;
  scrollCol?: number;
  scrollRow?: number;
  colorOverrides?: ColorOverrideMap;
}

/**
 * React component that renders a StampBuffer as DOM-based grid cells.
 * Consecutive cells with the same style are merged into single <span> elements.
 * Each span has data-col (start column) and data-row attributes for agent accessibility.
 * Viewport metadata is exposed via data attributes on the container.
 */
export function GridRenderer({
  buffer,
  palette,
  gridConfig,
  selectedLayerIds = [],
  zoom = 1,
  scrollCol = 0,
  scrollRow = 0,
  colorOverrides,
}: GridRendererProps): ReactNode {
  const rows = renderGridToElements(buffer, palette, colorOverrides);

  const fontStyle = gridConfig
    ? {
        fontFamily: gridConfig.fontFamily,
        fontSize: gridConfig.fontSize + 'px',
        lineHeight: gridConfig.cellHeight + 'px',
        whiteSpace: 'pre' as const,
      }
    : {
        fontFamily: "'IBM Plex Mono', monospace",
        whiteSpace: 'pre' as const,
        lineHeight: '18.9px',
      };

  return (
    <div
      className="grid-renderer"
      role="application"
      aria-label="Design Canvas"
      aria-description="ASCII grid preview. DOM-based rendering: div rows containing span segments. Each span has data-col and data-row. Click to select, drag to move."
      data-zoom={zoom}
      data-scroll-col={scrollCol}
      data-scroll-row={scrollRow}
      data-selected-layers={selectedLayerIds.length > 0 ? selectedLayerIds.join(',') : undefined}
      style={fontStyle}
    >
      {rows.map((row) => (
        <div
          key={row.row}
          className="grid-row"
          data-row={row.row}
          style={{ display: 'flex', height: gridConfig ? `${gridConfig.cellHeight}px` : '18.9px' }}
        >
          {row.spans.map((span) => (
            <span
              key={span.key}
              data-col={span.startCol}
              data-row={span.row}
              style={{
                color: span.color,
                backgroundColor: span.bg,
                fontWeight: span.fontWeight,
                // Extend background 1px right and down to cover sub-pixel gaps
                // from fractional cell dimensions (e.g. 8.4px × 18.9px).
                // Later DOM siblings paint on top, so overlap shows correct color.
                boxShadow: `1px 0 0 ${span.bg}, 0 1px 0 ${span.bg}`,
              }}
            >
              {span.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
