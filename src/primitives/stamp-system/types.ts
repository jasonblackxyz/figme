import type { StyleKey } from '@primitives/style-system/types.ts';

export interface StampBuffer {
  chars: string[][];
  styles: StyleKey[][];
  width: number;
  height: number;
}
