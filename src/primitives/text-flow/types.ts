import type { StyleKey } from '@primitives/style-system/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';

export interface TextFlowConfig {
  content: string;
  boundingRect: GridRect;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  kerning: 0 | 1 | 2;
  lineSpacing: 0 | 1;
  alignment: 'left' | 'center' | 'right';
}

export interface TextFlowResult {
  lines: FlowLine[];
  totalRows: number;
  overflow: boolean;
  overflowLineCount: number;
}

export interface FlowLine {
  row: number;
  segments: FlowSegment[];
}

export interface FlowSegment {
  text: string;
  styleKey: StyleKey;
  col: number;
}
