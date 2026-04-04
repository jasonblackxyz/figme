import type { StyleKey } from '@primitives/style-system/types.ts';

export interface InlineSegment {
  text: string;
  styleKey: StyleKey;
}

/**
 * Parse inline markdown formatting (# headings, **bold**) into styled segments.
 *
 * Stub: returns the input as a single plain-text segment.
 */
export function parseInlineMarkdown(
  content: string,
  defaultStyleKey: StyleKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: remove when implemented
  _headingStyleKey?: StyleKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: remove when implemented
  _boldStyleKey?: StyleKey,
): InlineSegment[] {
  return [{ text: content, styleKey: defaultStyleKey }];
}
