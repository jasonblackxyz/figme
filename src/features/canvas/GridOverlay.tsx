import type { GridConfig } from '@primitives/grid-engine/types.ts';

interface GridOverlayProps {
  gridConfig: GridConfig;
}

export function GridOverlay({ gridConfig }: GridOverlayProps) {
  const { cellWidth, cellHeight } = gridConfig;

  return (
    <div
      data-testid="grid-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage:
          `linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),` +
          `linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: `${cellWidth}px ${cellHeight}px`,
      }}
    />
  );
}
