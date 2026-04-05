import type { StyleKey } from '@primitives/style-system/types.ts';
import type { TextFlowConfig, TextFlowResult, FlowLine, FlowSegment } from './types.ts';
import { parseInlineMarkdown } from './parser.ts';
import type { InlineSegment } from './parser.ts';

/**
 * A word token with its style info, used during word-wrap processing.
 */
interface StyledWord {
  text: string;
  styleKey: StyleKey;
}

/**
 * Compute how text flows within a bounded grid region.
 * Handles word-wrapping, kerning, line-spacing, alignment, and overflow detection.
 *
 * - Parses inline markdown (# headings, **bold**)
 * - Word-wraps text within boundingRect minus padding
 * - Applies kerning (0=tight, 1=normal/single space, 2=extra space between chars)
 * - Applies lineSpacing (0=single, 1=double)
 * - Applies alignment (left/center/right within available width)
 * - Returns FlowLine[] with each line's segments positioned at correct col
 * - Detects overflow (lines exceeding available height)
 */
export function computeTextFlow(config: TextFlowConfig): TextFlowResult {
  const { content, boundingRect, padding, kerning, lineSpacing, alignment } = config;

  // Compute available dimensions after padding
  const availWidth = boundingRect.width - padding.left - padding.right;
  const availHeight = boundingRect.height - padding.top - padding.bottom;

  if (availWidth <= 0 || availHeight <= 0 || content.length === 0) {
    return { lines: [], totalRows: 0, overflow: false, overflowLineCount: 0 };
  }

  // Parse markdown using default style keys
  const defaultStyleKey: StyleKey = 'text';
  const headingStyleKey: StyleKey = 'modalHeading';
  const boldStyleKey: StyleKey = 'textBold';

  // Split content by newlines first to handle hard line breaks
  const contentLines = content.split('\n');

  // Process each line through markdown parsing and word-wrapping
  const allWrappedLines: StyledWord[][] = [];

  for (const line of contentLines) {
    const segments = parseInlineMarkdown(line, defaultStyleKey, headingStyleKey, boldStyleKey);

    if (segments.length === 0) {
      // Empty line
      allWrappedLines.push([]);
      continue;
    }

    // Break segments into words while preserving style
    const words = segmentsToWords(segments);

    // Word-wrap
    const wrapped = wordWrap(words, availWidth, kerning);
    for (const wl of wrapped) {
      allWrappedLines.push(wl);
    }
  }

  // Apply line spacing
  const rowIncrement = lineSpacing === 1 ? 2 : 1;

  // Build FlowLine results
  const flowLines: FlowLine[] = [];
  let currentRow = padding.top;

  for (const wrappedLine of allWrappedLines) {
    if (currentRow >= padding.top + availHeight) {
      break;
    }

    const lineSegments = layoutLine(
      wrappedLine,
      padding.left,
      availWidth,
      alignment,
      kerning,
    );

    flowLines.push({
      row: currentRow,
      segments: lineSegments,
    });

    currentRow += rowIncrement;
  }

  // Compute overflow
  const totalLogicalLines = allWrappedLines.length;
  const totalRowsNeeded = totalLogicalLines > 0
    ? (totalLogicalLines - 1) * rowIncrement + 1
    : 0;
  const fitsLines = Math.floor((availHeight - 1) / rowIncrement) + 1;
  const overflow = totalLogicalLines > fitsLines;
  const overflowLineCount = overflow ? totalLogicalLines - fitsLines : 0;

  return {
    lines: flowLines,
    totalRows: totalRowsNeeded,
    overflow,
    overflowLineCount,
  };
}

/**
 * Convert InlineSegments into an array of StyledWords.
 * Splits on spaces; each word carries its segment's styleKey.
 */
function segmentsToWords(segments: InlineSegment[]): StyledWord[] {
  const words: StyledWord[] = [];

  for (const seg of segments) {
    const parts = seg.text.split(/( +)/);
    for (const part of parts) {
      if (part.length > 0) {
        words.push({ text: part, styleKey: seg.styleKey });
      }
    }
  }

  return words;
}

/**
 * Compute the display width of a word given a kerning level.
 * Kerning 0 = tight (no extra), 1 = normal (no extra), 2 = extra space between chars.
 * For kerning 2, each char occupies 2 cells except the last which occupies 1.
 */
function wordDisplayWidth(text: string, kerning: 0 | 1 | 2): number {
  if (text.length === 0) return 0;
  if (kerning === 2) {
    return text.length * 2 - 1;
  }
  return text.length;
}

/**
 * Word-wrap an array of styled words to fit within availWidth.
 * Returns an array of lines, where each line is an array of StyledWords.
 */
function wordWrap(
  words: StyledWord[],
  availWidth: number,
  kerning: 0 | 1 | 2,
): StyledWord[][] {
  if (words.length === 0) {
    return [[]];
  }

  const lines: StyledWord[][] = [];
  let currentLine: StyledWord[] = [];
  let currentWidth = 0;

  for (const word of words) {
    const isSpace = word.text.trim().length === 0;
    const wWidth = wordDisplayWidth(word.text, kerning);

    if (isSpace) {
      // Spaces: add if they fit, otherwise skip at line start
      if (currentLine.length > 0 && currentWidth + wWidth <= availWidth) {
        currentLine.push(word);
        currentWidth += wWidth;
      }
      continue;
    }

    if (currentLine.length === 0) {
      // First word on line - always add (may be truncated if too wide)
      currentLine.push(word);
      currentWidth = wWidth;
    } else if (currentWidth + wWidth <= availWidth) {
      // Fits (space already included from word splitting)
      currentLine.push(word);
      currentWidth += wWidth;
    } else {
      // Doesn't fit - start new line
      lines.push(currentLine);
      currentLine = [word];
      currentWidth = wWidth;
    }
  }

  // Flush last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  } else if (lines.length === 0) {
    lines.push([]);
  }

  return lines;
}

/**
 * Layout a single wrapped line into positioned FlowSegments.
 * Applies alignment within the available width.
 */
function layoutLine(
  words: StyledWord[],
  leftPadding: number,
  availWidth: number,
  alignment: 'left' | 'center' | 'right',
  kerning: 0 | 1 | 2,
): FlowSegment[] {
  if (words.length === 0) return [];

  // Build the full text of the line from words, compute total width
  const segments: FlowSegment[] = [];
  let totalWidth = 0;

  // Measure total line width
  for (const word of words) {
    totalWidth += wordDisplayWidth(word.text, kerning);
  }

  // Compute alignment offset
  let startCol = leftPadding;
  if (alignment === 'center') {
    startCol += Math.max(0, Math.floor((availWidth - totalWidth) / 2));
  } else if (alignment === 'right') {
    startCol += Math.max(0, availWidth - totalWidth);
  }

  // Place each word as a segment
  let col = startCol;
  for (const word of words) {
    if (kerning === 2) {
      // Extra spacing: add space between each character
      const spacedText = word.text.split('').join(' ');
      segments.push({
        text: spacedText,
        styleKey: word.styleKey,
        col,
      });
      col += wordDisplayWidth(word.text, kerning);
    } else {
      segments.push({
        text: word.text,
        styleKey: word.styleKey,
        col,
      });
      col += word.text.length;
    }
  }

  return segments;
}
