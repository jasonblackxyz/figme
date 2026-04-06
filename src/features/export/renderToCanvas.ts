import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';

/**
 * Render a StampBuffer to an HTMLCanvasElement as a PNG-ready image.
 * Async to ensure the document font is loaded before rendering.
 */
export async function renderBufferToCanvas(
  buffer: StampBuffer,
  palette: Palette,
  gridConfig: GridConfig,
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;

  const { cellWidth, cellHeight, fontSize, fontFamily } = gridConfig;

  const canvasWidth = Math.ceil(buffer.width * cellWidth);
  const canvasHeight = Math.ceil(buffer.height * cellHeight);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  ctx.fillStyle = palette.bg.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render each cell
  const normalFont = `${fontSize}px ${fontFamily}`;
  const boldFont = `bold ${fontSize}px ${fontFamily}`;
  const baselineOffset = fontSize * 0.8;

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!charRow || !styleRow) continue;

    const y = r * cellHeight;

    for (let c = 0; c < buffer.width; c++) {
      const ch = charRow[c] ?? ' ';
      const styleKey = styleRow[c] ?? 'bg';
      const styleDef = palette[styleKey];
      if (!styleDef) continue;

      const x = c * cellWidth;

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

  return canvas;
}
