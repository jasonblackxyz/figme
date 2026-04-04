import type { FigletFont } from './types.ts';

/**
 * Parse a FIGlet .flf font file into a FigletFont structure.
 *
 * Stub: returns a minimal empty font. Real implementation will parse
 * the FIGlet header, comment lines, and character definitions.
 */
export function parseFLF(_flfContent: string): FigletFont {
  return {
    name: 'unknown',
    height: 1,
    baseline: 1,
    maxLength: 80,
    hardBlank: '$',
    commentLines: [],
    characters: {},
    smushRules: 0,
  };
}
