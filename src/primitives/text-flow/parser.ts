import type { StyleKey } from '@primitives/style-system/types.ts';

export interface InlineSegment {
  text: string;
  styleKey: StyleKey;
}

/**
 * Parse inline markdown formatting (# headings, **bold**) into styled segments.
 *
 * State-machine parser that detects:
 * - `# ` heading prefix at start of line -> apply headingStyleKey
 * - `**...**` bold markers -> apply boldStyleKey
 * - Multiple segments per line possible
 *
 * Returns InlineSegment[] where each segment has { text, styleKey }.
 */
export function parseInlineMarkdown(
  content: string,
  defaultStyleKey: StyleKey,
  headingStyleKey?: StyleKey,
  boldStyleKey?: StyleKey,
): InlineSegment[] {
  if (content.length === 0) {
    return [];
  }

  // Check for heading prefix at the start of the line
  let isHeading = false;
  let textToParse = content;

  if (content.startsWith('# ')) {
    isHeading = true;
    textToParse = content.slice(2);
  }

  const baseStyleKey: StyleKey = isHeading && headingStyleKey != null
    ? headingStyleKey
    : defaultStyleKey;

  const effectiveBoldStyleKey: StyleKey = boldStyleKey ?? baseStyleKey;

  // Parse **bold** markers using a state machine
  const segments: InlineSegment[] = [];
  let current = '';
  let i = 0;

  while (i < textToParse.length) {
    // Check for bold marker **
    if (
      textToParse[i] === '*' &&
      i + 1 < textToParse.length &&
      textToParse[i + 1] === '*'
    ) {
      // Found opening **, look for closing **
      const closeIdx = findClosingBold(textToParse, i + 2);
      if (closeIdx !== -1) {
        // Flush current text as normal segment
        if (current.length > 0) {
          segments.push({ text: current, styleKey: baseStyleKey });
          current = '';
        }
        // Extract bold text
        const boldText = textToParse.slice(i + 2, closeIdx);
        if (boldText.length > 0) {
          segments.push({ text: boldText, styleKey: effectiveBoldStyleKey });
        }
        i = closeIdx + 2;
        continue;
      }
    }

    current += textToParse[i];
    i++;
  }

  // Flush remaining text
  if (current.length > 0) {
    segments.push({ text: current, styleKey: baseStyleKey });
  }

  // If no segments were produced (empty textToParse after heading strip), return empty
  if (segments.length === 0 && textToParse.length === 0) {
    return [];
  }

  return segments;
}

/**
 * Find the index of the closing ** marker starting from position `start`.
 * Returns the index of the first * of the closing **, or -1 if not found.
 */
function findClosingBold(text: string, start: number): number {
  let j = start;
  while (j < text.length - 1) {
    if (text[j] === '*' && text[j + 1] === '*') {
      return j;
    }
    j++;
  }
  return -1;
}
