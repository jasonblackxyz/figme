import type { ReactNode } from 'react';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import { renderGridToElements } from './renderGrid.ts';

interface GridRendererProps {
  buffer: StampBuffer;
  palette: Palette;
  selectedLayerIds?: string[];
  zoom?: number;
  scrollCol?: number;
  scrollRow?: number;
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
  selectedLayerIds = [],
  zoom = 1,
  scrollCol = 0,
  scrollRow = 0,
}: GridRendererProps): ReactNode {
  const rows = renderGridToElements(buffer, palette);

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
      style={{ fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'pre', lineHeight: 1.35 }}
    >
      {rows.map((row) => (
        <div key={row.row} className="grid-row" data-row={row.row}>
          {row.spans.map((span) => (
            <span
              key={span.key}
              data-col={span.startCol}
              data-row={span.row}
              style={{
                color: span.color,
                backgroundColor: span.bg,
                fontWeight: span.fontWeight,
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
