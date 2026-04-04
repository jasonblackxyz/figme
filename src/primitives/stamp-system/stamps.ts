import type { StyleKey } from '@primitives/style-system/types.ts';
import type { GridRect } from '@primitives/grid-engine/types.ts';
import type { StampBuffer } from './types.ts';
import { createBuffer } from './buffer.ts';

/** Character sets for built-in border styles */
export const BORDER_CHARS = {
  rounded: { tl: '╭', t: '─', tr: '╮', l: '│', r: '│', bl: '╰', b: '─', br: '╯' },
  double:  { tl: '╔', t: '═', tr: '╗', l: '║', r: '║', bl: '╚', b: '═', br: '╝' },
  section: { tl: '┌', t: '─', tr: '┐', l: '│', r: '│', bl: '└', b: '─', br: '┘' },
} as const;

export type BorderCharSet = {
  tl: string; t: string; tr: string;
  l: string; r: string;
  bl: string; b: string; br: string;
};

/**
 * Internal helper: stamp a rectangular border with the given character set.
 * Fills the interior with spaces using bgStyle.
 */
function stampBorder(
  width: number,
  height: number,
  chars: BorderCharSet,
  borderStyle: StyleKey,
  bgStyle: StyleKey,
): StampBuffer {
  const buffer = createBuffer(width, height);
  if (width < 2 || height < 2) return buffer;

  // Fill interior with bg style
  for (let r = 1; r < height - 1; r++) {
    for (let c = 1; c < width - 1; c++) {
      buffer.chars[r]![c] = ' ';
      buffer.styles[r]![c] = bgStyle;
    }
  }

  // Top row
  buffer.chars[0]![0] = chars.tl;
  buffer.styles[0]![0] = borderStyle;
  for (let c = 1; c < width - 1; c++) {
    buffer.chars[0]![c] = chars.t;
    buffer.styles[0]![c] = borderStyle;
  }
  buffer.chars[0]![width - 1] = chars.tr;
  buffer.styles[0]![width - 1] = borderStyle;

  // Side rows
  for (let r = 1; r < height - 1; r++) {
    buffer.chars[r]![0] = chars.l;
    buffer.styles[r]![0] = borderStyle;
    buffer.chars[r]![width - 1] = chars.r;
    buffer.styles[r]![width - 1] = borderStyle;
  }

  // Bottom row
  buffer.chars[height - 1]![0] = chars.bl;
  buffer.styles[height - 1]![0] = borderStyle;
  for (let c = 1; c < width - 1; c++) {
    buffer.chars[height - 1]![c] = chars.b;
    buffer.styles[height - 1]![c] = borderStyle;
  }
  buffer.chars[height - 1]![width - 1] = chars.br;
  buffer.styles[height - 1]![width - 1] = borderStyle;

  return buffer;
}

/**
 * Stamp a rounded node box (╭ ╮ ╰ ╯ │ ─).
 * Matches readme-app's stampNodeBox from charUtils.ts.
 */
export function stampNodeBox(
  rect: GridRect,
  borderStyle: StyleKey,
  bgStyle: StyleKey,
): StampBuffer {
  return stampBorder(rect.width, rect.height, BORDER_CHARS.rounded, borderStyle, bgStyle);
}

/**
 * Stamp a double-line modal box (╔ ╗ ╚ ╝ ║ ═).
 * Matches readme-app's stampModalBox from charUtils.ts.
 */
export function stampModalBox(
  rect: GridRect,
  borderStyle: StyleKey,
  bgStyle: StyleKey,
): StampBuffer {
  return stampBorder(rect.width, rect.height, BORDER_CHARS.double, borderStyle, bgStyle);
}

/**
 * Stamp a section frame (┌ ┐ └ ┘ │ ─) with optional inset title.
 * Title is rendered as: ┌─ title ─┐
 * If title is too long, it is truncated with …
 */
export function stampSectionFrame(
  rect: GridRect,
  borderStyle: StyleKey,
  bgStyle: StyleKey,
  title?: string,
  titleStyle?: StyleKey,
): StampBuffer {
  const buffer = stampBorder(rect.width, rect.height, BORDER_CHARS.section, borderStyle, bgStyle);

  if (title && rect.width >= 6) {
    const maxTitleLen = rect.width - 5; // "┌─ " + title + " ─┐" → 5 chars for frame
    let displayTitle = title;
    if (displayTitle.length > maxTitleLen) {
      displayTitle = displayTitle.slice(0, maxTitleLen - 1) + '…';
    }

    // Write "─ title ─" into top row starting at col 1
    const startCol = 1;
    buffer.chars[0]![startCol] = '─';
    buffer.styles[0]![startCol] = borderStyle;
    buffer.chars[0]![startCol + 1] = ' ';
    buffer.styles[0]![startCol + 1] = borderStyle;

    const tStyle = titleStyle ?? borderStyle;
    for (let i = 0; i < displayTitle.length; i++) {
      const c = startCol + 2 + i;
      if (c >= rect.width - 1) break;
      buffer.chars[0]![c] = displayTitle[i]!;
      buffer.styles[0]![c] = tStyle;
    }

    const afterTitle = startCol + 2 + displayTitle.length;
    if (afterTitle < rect.width - 1) {
      buffer.chars[0]![afterTitle] = ' ';
      buffer.styles[0]![afterTitle] = borderStyle;
    }
    if (afterTitle + 1 < rect.width - 1) {
      buffer.chars[0]![afterTitle + 1] = '─';
      buffer.styles[0]![afterTitle + 1] = borderStyle;
    }
  }

  return buffer;
}

/**
 * Stamp a horizontal divider line using ─ characters.
 */
export function stampDivider(
  width: number,
  styleKey: StyleKey,
): StampBuffer {
  const buffer = createBuffer(width, 1);
  for (let c = 0; c < width; c++) {
    buffer.chars[0]![c] = '─';
    buffer.styles[0]![c] = styleKey;
  }
  return buffer;
}

/**
 * Stamp a horizontal divider with tee connectors (╟ ─ ╢).
 * Matches readme-app's stampHorizontalDivider from queryStamp.ts.
 */
export function stampHorizontalDivider(
  width: number,
  styleKey: StyleKey,
): StampBuffer {
  const buffer = createBuffer(width, 1);
  if (width < 2) return buffer;

  buffer.chars[0]![0] = '╟';
  buffer.styles[0]![0] = styleKey;

  for (let c = 1; c < width - 1; c++) {
    buffer.chars[0]![c] = '─';
    buffer.styles[0]![c] = styleKey;
  }

  buffer.chars[0]![width - 1] = '╢';
  buffer.styles[0]![width - 1] = styleKey;

  return buffer;
}

/**
 * Fill a rectangular region with a single character and style key.
 */
export function stampFill(
  width: number,
  height: number,
  char: string,
  styleKey: StyleKey,
): StampBuffer {
  const buffer = createBuffer(width, height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      buffer.chars[r]![c] = char;
      buffer.styles[r]![c] = styleKey;
    }
  }
  return buffer;
}

/**
 * Draw a rectangular border with user-selected character set.
 */
export function stampCustomBorder(
  rect: GridRect,
  chars: BorderCharSet,
  borderStyle: StyleKey,
  bgStyle: StyleKey,
): StampBuffer {
  return stampBorder(rect.width, rect.height, chars, borderStyle, bgStyle);
}
