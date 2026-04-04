import type { StyleKey } from '@primitives/style-system/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

export interface PatternTile {
  id: string;
  name: string;
  chars: string[][];
  styles: StyleKey[][];
  category: PatternCategory;
}

export type PatternCategory =
  | 'dots'
  | 'crosshatch'
  | 'wave'
  | 'brick'
  | 'diagonal'
  | 'shade'
  | 'custom';

export interface PatternFillConfig {
  tileId: string;
  region: GridRect;
  offsetCol: number;
  offsetRow: number;
  styleOverride?: StyleKey;
}
