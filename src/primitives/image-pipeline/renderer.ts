import type { ImageRenderConfig, ImageRenderResult, ImageRenderStyle } from './types.ts';

/**
 * ASCII brightness ramps for different rendering styles.
 */
const CLASSIC_RAMP = ' .:-=+*#%@';
const HATCH_RAMP = ' ░▒▓█';

/**
 * Clamp a value to the 0-1 range.
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Apply brightness and contrast adjustments to a value.
 * Formula: adjusted = clamp((value - 0.5) * contrast + 0.5 + brightness, 0, 1)
 */
function adjustBrightnessContrast(
  value: number,
  brightness: number,
  contrast: number,
): number {
  return clamp((value - 0.5) * contrast + 0.5 + brightness);
}

/**
 * Map a brightness value (0-1) to a character using a ramp string.
 * 0 maps to first char (darkest/empty), 1 maps to last char (brightest/fullest).
 */
function mapToRamp(brightness: number, ramp: string): string {
  const index = Math.min(
    Math.floor(brightness * ramp.length),
    ramp.length - 1,
  );
  return ramp[index] ?? ' ';
}

/**
 * Convert a 2x4 pixel block into a braille character (U+2800-U+28FF).
 *
 * Braille dot positions:
 * (0,0) (1,0)     dot 1  dot 4
 * (0,1) (1,1)     dot 2  dot 5
 * (0,2) (1,2)     dot 3  dot 6
 * (0,3) (1,3)     dot 7  dot 8
 */
function pixelBlockToBraille(block: boolean[][]): string {
  let code = 0x2800;

  // Left column dots: 1, 2, 3, 7
  if (block[0]?.[0]) code |= 0x01; // dot 1
  if (block[1]?.[0]) code |= 0x02; // dot 2
  if (block[2]?.[0]) code |= 0x04; // dot 3
  if (block[3]?.[0]) code |= 0x40; // dot 7

  // Right column dots: 4, 5, 6, 8
  if (block[0]?.[1]) code |= 0x08; // dot 4
  if (block[1]?.[1]) code |= 0x10; // dot 5
  if (block[2]?.[1]) code |= 0x20; // dot 6
  if (block[3]?.[1]) code |= 0x80; // dot 8

  return String.fromCodePoint(code);
}

/**
 * Convert a brightness grid to ASCII art using the specified style.
 *
 * This is the core character-mapping function for the image pipeline.
 * It takes a pre-computed 2D grid of brightness values (0-1) and maps
 * each cell to the appropriate character based on the rendering style.
 *
 * Styles:
 * - classic: 10-level ASCII ramp ` .:-=+*#%@`
 * - hatch: block elements `░▒▓█`
 * - braille: 2x4 pixel blocks mapped to Unicode braille chars
 * - smooth: same as classic (reserved for future interpolation)
 * - contour: same as classic (reserved for future edge detection)
 */
export function brightnessGridToAscii(
  grid: number[][],
  style: ImageRenderStyle,
  brightness: number,
  contrast: number,
  invert: boolean,
): ImageRenderResult {
  if (grid.length === 0) {
    return { chars: [], width: 0, height: 0 };
  }

  if (style === 'braille') {
    return brailleRender(grid, brightness, contrast, invert);
  }

  // For classic, smooth, contour, hatch — map each cell to a character
  const ramp = style === 'hatch' ? HATCH_RAMP : CLASSIC_RAMP;
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const chars: string[][] = [];

  for (let r = 0; r < height; r++) {
    const row: string[] = [];
    const gridRow = grid[r];
    if (!gridRow) {
      chars.push(row);
      continue;
    }
    for (let c = 0; c < width; c++) {
      let value = gridRow[c] ?? 0;
      value = adjustBrightnessContrast(value, brightness, contrast);
      if (invert) value = 1 - value;
      row.push(mapToRamp(value, ramp));
    }
    chars.push(row);
  }

  return { chars, width, height };
}

/**
 * Render brightness grid using braille characters.
 * Each braille character encodes a 2-wide x 4-tall pixel block.
 * The output is therefore (width/2) cols by (height/4) rows.
 */
function brailleRender(
  grid: number[][],
  brightness: number,
  contrast: number,
  invert: boolean,
): ImageRenderResult {
  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length ?? 0;

  if (gridHeight === 0 || gridWidth === 0) {
    return { chars: [], width: 0, height: 0 };
  }

  // Output dimensions: each braille char is 2x4 of the input
  const outHeight = Math.ceil(gridHeight / 4);
  const outWidth = Math.ceil(gridWidth / 2);
  const chars: string[][] = [];

  const threshold = 0.5;

  for (let outR = 0; outR < outHeight; outR++) {
    const row: string[] = [];
    for (let outC = 0; outC < outWidth; outC++) {
      // Collect the 4x2 block of booleans
      const block: boolean[][] = [];
      for (let dr = 0; dr < 4; dr++) {
        const pixelRow: boolean[] = [];
        for (let dc = 0; dc < 2; dc++) {
          const gr = outR * 4 + dr;
          const gc = outC * 2 + dc;
          let value = grid[gr]?.[gc] ?? 0;
          value = adjustBrightnessContrast(value, brightness, contrast);
          if (invert) value = 1 - value;
          pixelRow.push(value >= threshold);
        }
        block.push(pixelRow);
      }
      row.push(pixelBlockToBraille(block));
    }
    chars.push(row);
  }

  return { chars, width: outWidth, height: outHeight };
}

/**
 * Render a raster image into an ASCII character grid.
 *
 * This is a placeholder that returns an empty result.
 * Actual image loading is async and will be wired at the feature level.
 * The core value is in brightnessGridToAscii above.
 */
export function renderImageToAscii(
  _config: ImageRenderConfig,
): ImageRenderResult {
  return {
    chars: [],
    width: 0,
    height: 0,
  };
}
