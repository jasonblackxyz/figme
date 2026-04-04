import type { TextFlowConfig, TextFlowResult } from './types.ts';

/**
 * Compute how text flows within a bounded grid region.
 * Handles word-wrapping, kerning, line-spacing, alignment, and overflow detection.
 *
 * Stub: returns an empty result. Real implementation will handle
 * word-wrap, markdown parsing, and layout computation.
 */
export function computeTextFlow(_config: TextFlowConfig): TextFlowResult {
  return {
    lines: [],
    totalRows: 0,
    overflow: false,
    overflowLineCount: 0,
  };
}
