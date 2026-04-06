import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';

const RULER_GUTTER = 28;
const LABEL_FONT_SIZE = 11;
const FRAME_COLOR = '#000000';
const LABEL_COLOR = '#000000';
const LABEL_BG = '#e0e0e0';

/**
 * Render a StampBuffer to an HTMLCanvasElement as a PNG-ready image.
 * Async to ensure the document font is loaded before rendering.
 */
export async function renderBufferToCanvas(
  buffer: StampBuffer,
  palette: Palette,
  gridConfig: GridConfig,
  options?: { rulers?: boolean },
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const { cellWidth, cellHeight, fontSize, fontFamily } = gridConfig;
  const rulers = options?.rulers ?? false;
  const gutterX = rulers ? RULER_GUTTER : 0;
  const gutterY = rulers ? RULER_GUTTER : 0;

  const gridPixelWidth = Math.ceil(buffer.width * cellWidth);
  const gridPixelHeight = Math.ceil(buffer.height * cellHeight);
  const canvasWidth = gridPixelWidth + gutterX;
  const canvasHeight = gridPixelHeight + gutterY;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  // Fill entire canvas with label background when rulers are on, otherwise grid bg
  if (rulers) {
    ctx.fillStyle = LABEL_BG;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.fillStyle = palette.bg.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Render each cell
  const normalFont = `${fontSize}px ${fontFamily}`;
  const boldFont = `bold ${fontSize}px ${fontFamily}`;
  const baselineOffset = fontSize * 0.8;

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!charRow || !styleRow) continue;

    const y = gutterY + r * cellHeight;

    for (let c = 0; c < buffer.width; c++) {
      const ch = charRow[c] ?? ' ';
      const styleKey = styleRow[c] ?? 'bg';
      const styleDef = palette[styleKey];
      if (!styleDef) continue;

      const x = gutterX + c * cellWidth;

      // Background
      ctx.fillStyle = styleDef.bg;
      ctx.fillRect(x, y, cellWidth, cellHeight);

      // Character (skip spaces for performance)
      if (ch !== ' ') {
        ctx.fillStyle = styleDef.color;
        ctx.font = styleDef.fontWeight ? boldFont : normalFont;
        ctx.fillText(ch, x, y + baselineOffset);
      }
    }
  }

  // Draw dimension labels and frame border when rulers enabled
  if (rulers) {
    drawDimensionLabels(ctx, buffer, gridPixelWidth, gridPixelHeight, gutterX, gutterY);
  }

  return canvas;
}

function drawDimensionLabels(
  ctx: CanvasRenderingContext2D,
  buffer: StampBuffer,
  gridPixelWidth: number,
  gridPixelHeight: number,
  gutterX: number,
  gutterY: number,
): void {
  // Black border around the grid area
  ctx.strokeStyle = FRAME_COLOR;
  ctx.lineWidth = 2;
  ctx.strokeRect(gutterX - 1, gutterY - 1, gridPixelWidth + 2, gridPixelHeight + 2);

  // Top label: "X cells wide"
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = `bold ${LABEL_FONT_SIZE}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const widthLabel = `${buffer.width} cells wide`;
  ctx.fillText(widthLabel, gutterX + gridPixelWidth / 2, gutterY / 2);

  // Left label: "Y cells tall" (rotated)
  ctx.save();
  const heightLabel = `${buffer.height} cells tall`;
  ctx.translate(gutterX / 2, gutterY + gridPixelHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(heightLabel, 0, 0);
  ctx.restore();

  // Reset
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}
