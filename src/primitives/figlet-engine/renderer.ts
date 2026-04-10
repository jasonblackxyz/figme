import type { FigletFont, FigletRenderResult } from './types.ts';

/**
 * Render a text string using a FIGlet font.
 *
 * Simple concatenation (no smushing for v1):
 * - For each input char, look up character definition
 * - Concatenate side by side (each char occupies its width for each height line)
 * - Strip trailing spaces from each line, compute max width
 * - Return FigletRenderResult with lines, width, height
 */
export function renderFiglet(
  text: string,
  font: FigletFont,
): FigletRenderResult {
  if (text.length === 0) {
    return { lines: [], width: 0, height: 0 };
  }

  const height = font.height;

  // Initialize output lines
  const outputLines: string[] = [];
  for (let h = 0; h < height; h++) {
    outputLines.push('');
  }

  // For each input character, look up its FIGlet representation and append.
  // Each character's lines are padded to consistent width so subsequent
  // characters align vertically.
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const charCode = ch.charCodeAt(0);
    const charDef = font.characters[charCode];

    if (charDef && charDef[0]) {
      const charLines = charDef[0];
      // Find the max width across all lines of this character
      let charWidth = 0;
      for (let h = 0; h < height; h++) {
        const len = (charLines[h] ?? '').length;
        if (len > charWidth) charWidth = len;
      }
      // Append each line, padded to charWidth
      for (let h = 0; h < height; h++) {
        const line = charLines[h] ?? '';
        outputLines[h] += line.padEnd(charWidth);
      }
    } else {
      // Fallback: render the literal character for missing definitions
      for (let h = 0; h < height; h++) {
        if (h === 0) {
          outputLines[h] += ch;
        } else {
          outputLines[h] += ' ';
        }
      }
    }
  }

  // Strip trailing spaces from each line and compute max width
  let maxWidth = 0;
  for (let h = 0; h < height; h++) {
    const stripped = trimRight(outputLines[h] ?? '');
    outputLines[h] = stripped;
    if (stripped.length > maxWidth) {
      maxWidth = stripped.length;
    }
  }

  return {
    lines: outputLines,
    width: maxWidth,
    height,
  };
}

/**
 * Trim trailing spaces from a string.
 */
function trimRight(str: string): string {
  let end = str.length;
  while (end > 0 && str[end - 1] === ' ') {
    end--;
  }
  return str.slice(0, end);
}
