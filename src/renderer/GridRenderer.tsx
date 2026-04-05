import type { ReactNode } from 'react';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { renderGridToElements } from './renderGrid.ts';

interface GridRendererProps {
  buffer: StampBuffer;
  palette: Palette;
  gridConfig?: GridConfig;
}

/**
 * React component that renders a StampBuffer as DOM-based grid cells.
 * Consecutive cells with the same style are merged into single <span> elements.
 * Each span has data-col (start column) and data-row attributes for agent accessibility.
 */
export function GridRenderer({ buffer, palette, gridConfig }: GridRendererProps): ReactNode {
  const rows = renderGridToElements(buffer, palette);

  const fontStyle = gridConfig
    ? {
        fontFamily: gridConfig.fontFamily,
        fontSize: gridConfig.fontSize + 'px',
        lineHeight: gridConfig.lineHeight,
        whiteSpace: 'pre' as const,
      }
    : {
        fontFamily: "'IBM Plex Mono', monospace",
        whiteSpace: 'pre' as const,
        lineHeight: 1.35,
      };

  return (
    <div
      className="grid-renderer"
      role="application"
      aria-label="Design Canvas"
      aria-description="ASCII grid preview. DOM-based rendering: div rows containing span segments. Each span has data-col and data-row. Click to select, drag to move."
      style={fontStyle}
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
