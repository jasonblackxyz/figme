import { parseFLF } from '../parser.ts';
import type { FigletFont } from '../types.ts';
import { STANDARD_FLF } from './standard.ts';
import { SMALL_FLF } from './small.ts';
import { BANNER_FLF } from './banner.ts';
import { SLANT_FLF } from './slant.ts';
import { BIG_FLF } from './big.ts';

const fontCache = new Map<string, FigletFont>();

const FONT_SOURCES: Record<string, string> = {
  standard: STANDARD_FLF,
  small: SMALL_FLF,
  banner: BANNER_FLF,
  slant: SLANT_FLF,
  big: BIG_FLF,
};

/**
 * Get a parsed FIGlet font by name.
 * Fonts are lazily parsed and cached on first access.
 *
 * @param name - One of the available font names
 * @returns The parsed FigletFont, or null if the name is not recognized
 */
export function getFigletFont(name: string): FigletFont | null {
  const cached = fontCache.get(name);
  if (cached) return cached;

  const raw = FONT_SOURCES[name];
  if (!raw) return null;

  const font = parseFLF(raw);
  font.name = name;
  fontCache.set(name, font);
  return font;
}

/**
 * List of all available built-in font names.
 */
export const AVAILABLE_FONTS = ['standard', 'small', 'banner', 'slant', 'big'] as const;

export type FontName = (typeof AVAILABLE_FONTS)[number];
