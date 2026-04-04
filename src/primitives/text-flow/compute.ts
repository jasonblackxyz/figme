import type { TextFlowConfig, TextFlowResult, FlowLine, FlowSegment } from './types.ts';

/**
 * Compute how text flows within a bounded grid region.
 * Handles word-wrapping, kerning, line-spacing, alignment, and overflow detection.
 */
export function computeTextFlow(config: TextFlowConfig): TextFlowResult {
  const {
    content,
    boundingRect,
    padding,
    kerning,
    lineSpacing,
    alignment,
  } = config;

  const availableWidth = boundingRect.width - padding.left - padding.right;
  const availableHeight = boundingRect.height - padding.top - padding.bottom;

  if (availableWidth <= 0 || availableHeight <= 0) {
    return { lines: [], totalRows: 0, overflow: false, overflowLineCount: 0 };
  }

  // Split content into paragraphs, then wrap each
  const paragraphs = content.split('\n');
  const wrappedLines: string[] = [];

  for (const para of paragraphs) {
    if (para === '') {
      wrappedLines.push('');
      continue;
    }

    const words = para.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      wrappedLines.push('');
      continue;
    }

    let currentLine = '';
    for (const word of words) {
      const wordWidth = computeDisplayWidth(word, kerning);
      if (currentLine === '') {
        // First word on line — always add it even if it overflows
        currentLine = word;
      } else {
        // Check if adding this word (with a space separator) fits
        const separatorWidth = 1 + kerning; // space + kerning
        const combinedWidth = computeDisplayWidth(currentLine, kerning) + separatorWidth + wordWidth;
        if (combinedWidth <= availableWidth) {
          currentLine += ' ' + word;
        } else {
          // Wrap: flush current line and start new one
          wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
    }
    if (currentLine !== '') {
      wrappedLines.push(currentLine);
    }
  }

  // Calculate row stride (each line occupies 1 + lineSpacing rows)
  const rowStride = 1 + lineSpacing;
  const maxLines = Math.floor((availableHeight + lineSpacing) / rowStride);
  const overflow = wrappedLines.length > maxLines;
  const overflowLineCount = overflow ? wrappedLines.length - maxLines : 0;
  const visibleLines = overflow ? wrappedLines.slice(0, maxLines) : wrappedLines;

  // Build FlowLines with alignment
  const lines: FlowLine[] = visibleLines.map((text, i) => {
    const displayWidth = computeDisplayWidth(text, kerning);
    let col = padding.left + boundingRect.col;

    if (alignment === 'center') {
      col += Math.floor((availableWidth - displayWidth) / 2);
    } else if (alignment === 'right') {
      col += availableWidth - displayWidth;
    }

    const row = padding.top + boundingRect.row + i * rowStride;

    const segments: FlowSegment[] = text.length > 0
      ? [{ text: applyKerning(text, kerning), styleKey: 'text', col }]
      : [];

    return { row, segments };
  });

  const totalRows = wrappedLines.length > 0
    ? (wrappedLines.length - 1) * rowStride + 1
    : 0;

  return { lines, totalRows, overflow, overflowLineCount };
}

/**
 * Compute the display width of a string with kerning applied.
 * Kerning adds extra spaces between each character.
 */
function computeDisplayWidth(text: string, kerning: number): number {
  if (text.length === 0) return 0;
  return text.length + (text.length - 1) * kerning;
}

/**
 * Apply kerning to a string by inserting extra spaces between characters.
 */
function applyKerning(text: string, kerning: number): string {
  if (kerning === 0 || text.length <= 1) return text;
  return text.split('').join(' '.repeat(kerning));
}
