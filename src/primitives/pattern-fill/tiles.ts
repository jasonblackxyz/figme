import type { PatternTile } from './types.ts';

/**
 * Built-in pattern tiles for pattern fills.
 */
export const BUILT_IN_PATTERNS: PatternTile[] = [
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
];
