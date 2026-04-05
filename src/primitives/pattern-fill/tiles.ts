import type { PatternTile } from './types.ts';

/**
 * Built-in pattern tiles for pattern fills.
 */
export const BUILT_IN_PATTERNS: PatternTile[] = [
  // --- Original 3 patterns ---
  {
    id: 'light-dots',
    name: 'Light Dots',
    chars: [['.', ' '], [' ', '.']],
    styles: [['dot', 'bg'], ['bg', 'dot']],
    category: 'dots',
  },
  {
    id: 'light-shade',
    name: 'Light Shade',
    chars: [['░']],
    styles: [['dim']],
    category: 'shade',
  },
  {
    id: 'crosshatch',
    name: 'Crosshatch',
    chars: [['/', '\\'], ['\\', '/']],
    styles: [['border', 'border'], ['border', 'border']],
    category: 'crosshatch',
  },
  // --- 6 new patterns ---
  {
    id: 'diagonal-right',
    name: 'Diagonal Right',
    chars: [
      [' ', '/', ' ', ' '],
      ['/', ' ', ' ', ' '],
      [' ', ' ', ' ', '/'],
      [' ', ' ', '/', ' '],
    ],
    styles: [
      ['bg', 'border', 'bg', 'bg'],
      ['border', 'bg', 'bg', 'bg'],
      ['bg', 'bg', 'bg', 'border'],
      ['bg', 'bg', 'border', 'bg'],
    ],
    category: 'diagonal',
  },
  {
    id: 'diagonal-left',
    name: 'Diagonal Left',
    chars: [
      [' ', ' ', '\\', ' '],
      [' ', ' ', ' ', '\\'],
      ['\\', ' ', ' ', ' '],
      [' ', '\\', ' ', ' '],
    ],
    styles: [
      ['bg', 'bg', 'border', 'bg'],
      ['bg', 'bg', 'bg', 'border'],
      ['border', 'bg', 'bg', 'bg'],
      ['bg', 'border', 'bg', 'bg'],
    ],
    category: 'diagonal',
  },
  {
    id: 'brick',
    name: 'Brick',
    chars: [
      ['─', '─', '─', '│'],
      ['─', '│', '─', '─'],
    ],
    styles: [
      ['border', 'border', 'border', 'border'],
      ['border', 'border', 'border', 'border'],
    ],
    category: 'brick',
  },
  {
    id: 'medium-shade',
    name: 'Medium Shade',
    chars: [['▒']],
    styles: [['dim']],
    category: 'shade',
  },
  {
    id: 'dark-shade',
    name: 'Dark Shade',
    chars: [['▓']],
    styles: [['dim']],
    category: 'shade',
  },
  {
    id: 'wave',
    name: 'Wave',
    chars: [
      ['~', '~', '~', '~'],
      [' ', ' ', ' ', ' '],
    ],
    styles: [
      ['accentText', 'accentText', 'accentText', 'accentText'],
      ['bg', 'bg', 'bg', 'bg'],
    ],
    category: 'wave',
  },
];
