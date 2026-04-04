import type { GridPosition, GridRect } from '@primitives/grid-engine/types.ts';

export interface Guide {
  orientation: 'horizontal' | 'vertical';
  position: number;
  fromCell: number;
  toCell: number;
  kind: 'edge' | 'center' | 'spacing' | 'padding';
  label?: string;
}

export interface GuideResult {
  guides: Guide[];
  snapSuggestion?: GridPosition;
}

export interface AutoLayoutResult {
  childRects: Record<string, GridRect>;
  parentRect: GridRect;
  overflow: boolean;
}

export interface AlignmentResult {
  newPositions: Record<string, GridPosition>;
}

export type AlignmentMode =
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-center-v'
  | 'align-bottom'
  | 'distribute-h'
  | 'distribute-v';
