import type { StyleKey, Palette, Theme } from './types.ts';

/**
 * All 40 style keys in the system.
 */
export const STYLE_KEYS: StyleKey[] = [
  'bg', 'dot', 'border', 'dim',
  'text', 'badge', 'edge', 'accentBorder', 'accentText', 'nodeBg',
  'modalBorder', 'modalBg', 'modalTitle', 'modalText', 'modalClose',
  'modalTab', 'modalTabActive', 'modalHint', 'modalTitleBold', 'modalHeading',
  'queryBorder', 'queryBg', 'queryText', 'queryCursor', 'queryHint',
  'queryButton', 'queryButtonActive', 'queryError', 'queryPill', 'queryPillBlink',
  'queryDivider', 'queryCitation', 'queryMatch',
  'textBold', 'dimOnCard',
  'imageDeep', 'imageMid', 'imageLight', 'imageEdge',
  'success',
];

/**
 * Create a full Palette by mapping theme colors to each style key.
 * Uses a dark theme color scheme as the basis.
 */
export function createAsciiPalette(theme: Theme): Palette {
  const { colors } = theme;
  const bg = colors.background;
  const fg = colors.foreground;
  const accent = colors.accent;
  const accentFg = colors.accentForeground;
  const muted = colors.muted;
  const mutedFg = colors.mutedForeground;
  const borderColor = colors.border;
  const card = colors.card;
  const cardFg = colors.cardForeground;
  const error = colors.error;

  const palette: Palette = {
    // Background
    bg: { color: fg, bg },
    dot: { color: muted, bg },
    border: { color: borderColor, bg },
    dim: { color: mutedFg, bg },

    // Nodes
    text: { color: fg, bg: card },
    badge: { color: accentFg, bg: accent },
    edge: { color: borderColor, bg },
    accentBorder: { color: accent, bg },
    accentText: { color: accent, bg },
    nodeBg: { color: cardFg, bg: card },

    // Modals
    modalBorder: { color: borderColor, bg: card },
    modalBg: { color: cardFg, bg: card },
    modalTitle: { color: fg, bg: card, fontWeight: 700 },
    modalText: { color: cardFg, bg: card },
    modalClose: { color: mutedFg, bg: card },
    modalTab: { color: mutedFg, bg: card },
    modalTabActive: { color: accent, bg: card },
    modalHint: { color: mutedFg, bg: card },
    modalTitleBold: { color: fg, bg: card, fontWeight: 700 },
    modalHeading: { color: accent, bg: card, fontWeight: 700 },

    // Query
    queryBorder: { color: accent, bg },
    queryBg: { color: fg, bg },
    queryText: { color: fg, bg },
    queryCursor: { color: accent, bg },
    queryHint: { color: mutedFg, bg },
    queryButton: { color: mutedFg, bg },
    queryButtonActive: { color: accentFg, bg: accent },
    queryError: { color: error, bg },
    queryPill: { color: accent, bg },
    queryPillBlink: { color: accentFg, bg: accent },
    queryDivider: { color: borderColor, bg },
    queryCitation: { color: mutedFg, bg },
    queryMatch: { color: accent, bg, fontWeight: 700 },

    // Text
    textBold: { color: fg, bg: card, fontWeight: 700 },
    dimOnCard: { color: mutedFg, bg: card },

    // Image
    imageDeep: { color: '#222222', bg },
    imageMid: { color: '#888888', bg },
    imageLight: { color: '#cccccc', bg },
    imageEdge: { color: '#ffffff', bg },

    // Status
    success: { color: colors.success, bg },
  };

  return palette;
}
