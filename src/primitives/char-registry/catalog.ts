import type { CharEntry, CharCategory, CharRegistry } from './types.ts';

export const CHAR_CATALOG: CharEntry[] = [
  // Box-drawing (single-line)
  { char: '─', codepoint: 0x2500, name: 'BOX DRAWINGS LIGHT HORIZONTAL', category: 'box-drawing', tags: ['horizontal', 'line', 'thin'], width: 'narrow' },
  { char: '│', codepoint: 0x2502, name: 'BOX DRAWINGS LIGHT VERTICAL', category: 'box-drawing', tags: ['vertical', 'line', 'thin'], width: 'narrow' },
  { char: '┌', codepoint: 0x250C, name: 'BOX DRAWINGS LIGHT DOWN AND RIGHT', category: 'box-drawing', tags: ['corner', 'top-left'], width: 'narrow' },
  { char: '┐', codepoint: 0x2510, name: 'BOX DRAWINGS LIGHT DOWN AND LEFT', category: 'box-drawing', tags: ['corner', 'top-right'], width: 'narrow' },
  { char: '└', codepoint: 0x2514, name: 'BOX DRAWINGS LIGHT UP AND RIGHT', category: 'box-drawing', tags: ['corner', 'bottom-left'], width: 'narrow' },
  { char: '┘', codepoint: 0x2518, name: 'BOX DRAWINGS LIGHT UP AND LEFT', category: 'box-drawing', tags: ['corner', 'bottom-right'], width: 'narrow' },
  { char: '╭', codepoint: 0x256D, name: 'BOX DRAWINGS LIGHT ARC DOWN AND RIGHT', category: 'box-drawing', tags: ['corner', 'rounded', 'top-left'], width: 'narrow' },
  { char: '╮', codepoint: 0x256E, name: 'BOX DRAWINGS LIGHT ARC DOWN AND LEFT', category: 'box-drawing', tags: ['corner', 'rounded', 'top-right'], width: 'narrow' },
  { char: '╰', codepoint: 0x2570, name: 'BOX DRAWINGS LIGHT ARC UP AND RIGHT', category: 'box-drawing', tags: ['corner', 'rounded', 'bottom-left'], width: 'narrow' },
  { char: '╯', codepoint: 0x256F, name: 'BOX DRAWINGS LIGHT ARC UP AND LEFT', category: 'box-drawing', tags: ['corner', 'rounded', 'bottom-right'], width: 'narrow' },

  // Box-double
  { char: '═', codepoint: 0x2550, name: 'BOX DRAWINGS DOUBLE HORIZONTAL', category: 'box-double', tags: ['horizontal', 'line', 'double', 'heavy'], width: 'narrow' },
  { char: '║', codepoint: 0x2551, name: 'BOX DRAWINGS DOUBLE VERTICAL', category: 'box-double', tags: ['vertical', 'line', 'double', 'heavy'], width: 'narrow' },
  { char: '╔', codepoint: 0x2554, name: 'BOX DRAWINGS DOUBLE DOWN AND RIGHT', category: 'box-double', tags: ['corner', 'double', 'top-left'], width: 'narrow' },
  { char: '╗', codepoint: 0x2557, name: 'BOX DRAWINGS DOUBLE DOWN AND LEFT', category: 'box-double', tags: ['corner', 'double', 'top-right'], width: 'narrow' },

  // Block elements
  { char: '█', codepoint: 0x2588, name: 'FULL BLOCK', category: 'block-elements', tags: ['block', 'full', 'solid'], width: 'narrow' },
  { char: '▓', codepoint: 0x2593, name: 'DARK SHADE', category: 'block-elements', tags: ['shade', 'dark', 'fill'], width: 'narrow' },
  { char: '▒', codepoint: 0x2592, name: 'MEDIUM SHADE', category: 'block-elements', tags: ['shade', 'medium', 'fill'], width: 'narrow' },
  { char: '░', codepoint: 0x2591, name: 'LIGHT SHADE', category: 'block-elements', tags: ['shade', 'light', 'fill'], width: 'narrow' },
  { char: '▄', codepoint: 0x2584, name: 'LOWER HALF BLOCK', category: 'block-elements', tags: ['block', 'half', 'lower', 'bottom'], width: 'narrow' },
  { char: '▀', codepoint: 0x2580, name: 'UPPER HALF BLOCK', category: 'block-elements', tags: ['block', 'half', 'upper', 'top'], width: 'narrow' },

  // Arrows
  { char: '←', codepoint: 0x2190, name: 'LEFTWARDS ARROW', category: 'arrows', tags: ['arrow', 'left', 'direction'], width: 'narrow' },
  { char: '→', codepoint: 0x2192, name: 'RIGHTWARDS ARROW', category: 'arrows', tags: ['arrow', 'right', 'direction'], width: 'narrow' },
  { char: '↑', codepoint: 0x2191, name: 'UPWARDS ARROW', category: 'arrows', tags: ['arrow', 'up', 'direction'], width: 'narrow' },
  { char: '↓', codepoint: 0x2193, name: 'DOWNWARDS ARROW', category: 'arrows', tags: ['arrow', 'down', 'direction'], width: 'narrow' },

  // Geometric
  { char: '●', codepoint: 0x25CF, name: 'BLACK CIRCLE', category: 'geometric', tags: ['circle', 'filled', 'dot'], width: 'narrow' },
  { char: '○', codepoint: 0x25CB, name: 'WHITE CIRCLE', category: 'geometric', tags: ['circle', 'empty', 'ring'], width: 'narrow' },
  { char: '■', codepoint: 0x25A0, name: 'BLACK SQUARE', category: 'geometric', tags: ['square', 'filled', 'block'], width: 'narrow' },
  { char: '□', codepoint: 0x25A1, name: 'WHITE SQUARE', category: 'geometric', tags: ['square', 'empty', 'outline'], width: 'narrow' },

  // Dingbats
  { char: '✓', codepoint: 0x2713, name: 'CHECK MARK', category: 'dingbats', tags: ['check', 'tick', 'yes', 'done'], width: 'narrow' },
  { char: '✗', codepoint: 0x2717, name: 'BALLOT X', category: 'dingbats', tags: ['cross', 'x', 'no', 'cancel'], width: 'narrow' },

  // Technical
  { char: '⌘', codepoint: 0x2318, name: 'PLACE OF INTEREST SIGN', category: 'technical', tags: ['command', 'mac', 'keyboard'], width: 'narrow' },
  { char: '⏎', codepoint: 0x23CE, name: 'RETURN SYMBOL', category: 'technical', tags: ['return', 'enter', 'keyboard'], width: 'narrow' },

  // Mathematical
  { char: '±', codepoint: 0x00B1, name: 'PLUS-MINUS SIGN', category: 'mathematical', tags: ['plus', 'minus', 'math'], width: 'narrow' },
  { char: '∞', codepoint: 0x221E, name: 'INFINITY', category: 'mathematical', tags: ['infinity', 'math', 'symbol'], width: 'narrow' },

  // Punctuation-extended
  { char: '·', codepoint: 0x00B7, name: 'MIDDLE DOT', category: 'punctuation-extended', tags: ['dot', 'middle', 'bullet', 'separator'], width: 'narrow' },
  { char: '•', codepoint: 0x2022, name: 'BULLET', category: 'punctuation-extended', tags: ['bullet', 'list', 'dot'], width: 'narrow' },
  { char: '…', codepoint: 0x2026, name: 'HORIZONTAL ELLIPSIS', category: 'punctuation-extended', tags: ['ellipsis', 'dots', 'continuation'], width: 'narrow' },

  // Braille
  { char: '⠀', codepoint: 0x2800, name: 'BRAILLE PATTERN BLANK', category: 'braille', tags: ['braille', 'blank', 'empty'], width: 'narrow' },
  { char: '⣿', codepoint: 0x28FF, name: 'BRAILLE PATTERN DOTS-12345678', category: 'braille', tags: ['braille', 'full', 'all-dots'], width: 'narrow' },
];

/**
 * Create a CharRegistry backed by the given catalog (defaults to CHAR_CATALOG).
 */
export function createCharRegistry(initialCatalog?: CharEntry[]): CharRegistry {
  const entries = [...(initialCatalog ?? CHAR_CATALOG)];
  const favorites: string[] = [];
  const recent: string[] = [];

  return {
    entries,
    favorites,
    recent,

    search(query: string): CharEntry[] {
      const q = query.toLowerCase();
      return entries.filter(
        (e) =>
          e.char.includes(query) ||
          e.name.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)),
      );
    },

    getByCategory(cat: CharCategory): CharEntry[] {
      return entries.filter((e) => e.category === cat);
    },

    addCustom(char: string, tags: string[]): void {
      entries.push({
        char,
        codepoint: char.codePointAt(0) ?? 0,
        name: `CUSTOM: ${char}`,
        category: 'custom',
        tags,
        width: 'narrow',
      });
    },
  };
}
