/**
 * Hardcoded brightness lookup table for common ASCII/Unicode characters.
 * Values represent approximate fill ratio 0-1 (0=empty, 1=fully filled).
 * Used as fallback when canvas is not available (e.g., test environments).
 */
const BRIGHTNESS_TABLE: Record<string, number> = {
  ' ': 0.0,
  '.': 0.05,
  ',': 0.06,
  '`': 0.05,
  "'": 0.05,
  ':': 0.08,
  ';': 0.10,
  '-': 0.10,
  '~': 0.12,
  '!': 0.12,
  '"': 0.10,
  '^': 0.08,
  '_': 0.08,
  '=': 0.18,
  '+': 0.20,
  '<': 0.15,
  '>': 0.15,
  '?': 0.20,
  '/': 0.15,
  '\\': 0.15,
  '|': 0.15,
  '(': 0.15,
  ')': 0.15,
  '[': 0.18,
  ']': 0.18,
  '{': 0.20,
  '}': 0.20,
  '*': 0.25,
  'i': 0.20,
  'l': 0.20,
  't': 0.25,
  'r': 0.28,
  'c': 0.30,
  'o': 0.35,
  'e': 0.35,
  'a': 0.35,
  's': 0.32,
  'n': 0.35,
  'u': 0.35,
  'h': 0.38,
  'd': 0.38,
  'p': 0.38,
  'b': 0.38,
  'k': 0.35,
  'x': 0.35,
  'v': 0.30,
  'w': 0.40,
  'm': 0.45,
  'g': 0.38,
  'f': 0.25,
  'j': 0.22,
  'y': 0.30,
  'z': 0.32,
  'q': 0.38,
  'A': 0.40,
  'B': 0.45,
  'C': 0.35,
  'D': 0.42,
  'E': 0.40,
  'F': 0.35,
  'G': 0.42,
  'H': 0.45,
  'I': 0.25,
  'J': 0.25,
  'K': 0.40,
  'L': 0.28,
  'M': 0.52,
  'N': 0.48,
  'O': 0.42,
  'P': 0.38,
  'Q': 0.45,
  'R': 0.42,
  'S': 0.38,
  'T': 0.30,
  'U': 0.40,
  'V': 0.35,
  'W': 0.55,
  'X': 0.40,
  'Y': 0.30,
  'Z': 0.38,
  '0': 0.42,
  '1': 0.22,
  '2': 0.38,
  '3': 0.38,
  '4': 0.35,
  '5': 0.38,
  '6': 0.40,
  '7': 0.28,
  '8': 0.48,
  '9': 0.40,
  '#': 0.55,
  '%': 0.50,
  '@': 0.65,
  '&': 0.50,
  '$': 0.48,
  '─': 0.15,
  '│': 0.15,
  '┌': 0.18,
  '┐': 0.18,
  '└': 0.18,
  '┘': 0.18,
  '╭': 0.15,
  '╮': 0.15,
  '╰': 0.15,
  '╯': 0.15,
  '░': 0.25,
  '▒': 0.50,
  '▓': 0.75,
  '█': 1.0,
  '▀': 0.50,
  '▄': 0.50,
  '▌': 0.50,
  '▐': 0.50,
};

/** Module-level cache: key is `${char}|${fontFamily}|${fontSize}` */
const brightnessCache = new Map<string, number>();

/**
 * Measure the visual brightness of a character when rendered in a monospace font.
 * Returns a value from 0 (empty/dark) to 1 (fully filled/bright).
 *
 * Attempts to render the character to a canvas and count filled pixels.
 * Falls back to a hardcoded lookup table for environments without canvas support.
 * Results are cached per char+font+size combination.
 */
export function measureCharBrightness(
  char: string,
  fontFamily: string = 'IBM Plex Mono',
  fontSize: number = 14,
): number {
  if (char.length === 0) return 0;

  const cacheKey = `${char}|${fontFamily}|${fontSize}`;
  const cached = brightnessCache.get(cacheKey);
  if (cached !== undefined) return cached;

  // Try canvas measurement
  const canvasResult = measureWithCanvas(char, fontFamily, fontSize);
  if (canvasResult !== null) {
    brightnessCache.set(cacheKey, canvasResult);
    return canvasResult;
  }

  // Fallback to hardcoded lookup table
  const tableValue = BRIGHTNESS_TABLE[char];
  const result = tableValue ?? 0.3; // default mid-range for unknown chars
  brightnessCache.set(cacheKey, result);
  return result;
}

/**
 * Attempt to measure character brightness using OffscreenCanvas or
 * document.createElement('canvas'). Returns null if canvas is unavailable.
 */
function measureWithCanvas(
  char: string,
  fontFamily: string,
  fontSize: number,
): number | null {
  // Approximate cell dimensions based on font size
  const cellWidth = Math.ceil(fontSize * 0.6);
  const cellHeight = Math.ceil(fontSize * 1.35);

  let canvas: { getContext(id: '2d'): CanvasRenderingContext2D | null; width: number; height: number } | null = null;

  // Try OffscreenCanvas first
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      canvas = new OffscreenCanvas(cellWidth, cellHeight) as unknown as typeof canvas;
    } catch {
      // OffscreenCanvas not available in this context
    }
  }

  // Try document.createElement('canvas')
  if (canvas === null && typeof document !== 'undefined') {
    try {
      const el = document.createElement('canvas');
      el.width = cellWidth;
      el.height = cellHeight;
      canvas = el;
    } catch {
      // document not available
    }
  }

  if (canvas === null) return null;

  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  // Clear to black (all zeros)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, cellWidth, cellHeight);

  // Draw character in white
  ctx.fillStyle = 'white';
  ctx.font = `${fontSize}px "${fontFamily}", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(char, 0, 0);

  // Read pixels and count white ones
  const imageData = ctx.getImageData(0, 0, cellWidth, cellHeight);
  const pixels = imageData.data;
  const totalPixels = cellWidth * cellHeight;

  if (totalPixels === 0) return 0;

  let filledPixels = 0;
  // Every 4th value starting from index 0 is the red channel
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    if (r !== undefined && r > 128) {
      filledPixels++;
    }
  }

  return filledPixels / totalPixels;
}
