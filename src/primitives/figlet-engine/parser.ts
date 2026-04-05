import type { FigletFont } from './types.ts';

/**
 * Parse a FIGlet .flf font file into a FigletFont structure.
 *
 * FLF format:
 * - Line 0: header `flf2a<hardblank> height baseline maxLength oldLayout commentLines [printDirection [fullLayout [codeTagCount]]]`
 * - Next N lines: comments (N = commentLines from header)
 * - Then character definitions: space (32) through tilde (126), each is `height` lines
 * - Each char line ends with `@` (more lines) or `@@` (last line of char)
 * - Replace hardblank with space in output
 */
export function parseFLF(flfContent: string): FigletFont {
  const lines = flfContent.split('\n');

  if (lines.length === 0) {
    return emptyFont();
  }

  // Parse header line
  const headerLine = lines[0];
  if (!headerLine || !headerLine.startsWith('flf2a')) {
    return emptyFont();
  }

  // The hardblank is the character immediately after "flf2a"
  const hardBlank = headerLine[5] ?? '$';

  // Split the rest of the header after the signature+hardblank
  const headerParts = headerLine.slice(6).trim().split(/\s+/);

  const height = parseInt(headerParts[0] ?? '1', 10);
  const baseline = parseInt(headerParts[1] ?? '1', 10);
  const maxLength = parseInt(headerParts[2] ?? '80', 10);
  const oldLayout = parseInt(headerParts[3] ?? '0', 10);
  const commentLineCount = parseInt(headerParts[4] ?? '0', 10);
  // printDirection, fullLayout, codeTagCount are optional
  const fullLayout = headerParts.length > 6 ? parseInt(headerParts[6] ?? '0', 10) : undefined;

  // Extract comment lines
  const commentLines: string[] = [];
  for (let i = 1; i <= commentLineCount && i < lines.length; i++) {
    commentLines.push(lines[i] ?? '');
  }

  // Parse character definitions starting after header + comments
  const charStartLine = 1 + commentLineCount;
  const characters: Record<number, string[][]> = {};

  let lineIdx = charStartLine;
  // Standard FIGlet fonts define chars 32 (space) through 126 (~)
  for (let charCode = 32; charCode <= 126; charCode++) {
    if (lineIdx >= lines.length) break;

    const charLines: string[] = [];
    for (let h = 0; h < height; h++) {
      if (lineIdx >= lines.length) break;
      let line = lines[lineIdx] ?? '';

      // Strip trailing @ or @@ markers
      line = stripEndMarkers(line);

      // Replace hardblank with space
      line = replaceAll(line, hardBlank, ' ');

      charLines.push(line);
      lineIdx++;
    }

    // Store as [charLines] to match the Record<number, string[][]> type
    characters[charCode] = [charLines];
  }

  const smushRules = fullLayout ?? oldLayout;

  return {
    name: 'unknown',
    height,
    baseline,
    maxLength,
    hardBlank,
    commentLines,
    characters,
    smushRules,
  };
}

/**
 * Strip trailing @ and @@ markers from a FIGlet character line.
 */
function stripEndMarkers(line: string): string {
  // Remove trailing @@ first, then single @
  if (line.endsWith('@@')) {
    return line.slice(0, -2);
  }
  if (line.endsWith('@')) {
    return line.slice(0, -1);
  }
  return line;
}

/**
 * Replace all occurrences of a character in a string.
 */
function replaceAll(str: string, search: string, replacement: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === search) {
      result += replacement;
    } else {
      result += str[i];
    }
  }
  return result;
}

/**
 * Create a minimal empty font for error cases.
 */
function emptyFont(): FigletFont {
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
