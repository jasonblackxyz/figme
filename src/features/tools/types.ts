import type { GridPosition } from '@primitives/grid-engine/types.ts';

export interface ToolHandler {
  onPointerDown(gridPos: GridPosition, event: PointerEvent): void;
  onPointerMove(gridPos: GridPosition, event: PointerEvent): void;
  onPointerUp(gridPos: GridPosition, event: PointerEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  cursor: string;
}
