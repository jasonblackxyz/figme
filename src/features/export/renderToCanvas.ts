import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { Palette } from '@primitives/style-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';
import { DEFAULT_PAGE_BACKGROUND_COLOR } from '@primitives/document-model/pageBackground.ts';

const BG_STYLE = 'bg';

/**
 * Render a StampBuffer to an HTMLCanvasElement as a PNG-ready image.
 * Async to ensure the document font is loaded before rendering.
 */
export async function renderBufferToCanvas(
  buffer: StampBuffer,
  palette: Palette,
  gridConfig: GridConfig,
  colorOverrides?: ColorOverrideMap,
  pageBackgroundColor: string = DEFAULT_PAGE_BACKGROUND_COLOR,
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

  ctx.fillStyle = pageBackgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render each cell
  const normalFont = `${fontSize}px ${fontFamily}`;
  const boldFont = `bold ${fontSize}px ${fontFamily}`;
  const baselineOffset = fontSize * 0.8;

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!charRow || !styleRow) continue;

    // Edge-aligned integer rows: compute each boundary independently so adjacent
    // cells share an exact pixel edge, absorbing fractional drift naturally.
    // Prevents sub-pixel antialiasing that produces horizontal gray bars.
    const y = Math.round(r * cellHeight);
    const h =
      r === buffer.height - 1
        ? canvasHeight - y
        : Math.round((r + 1) * cellHeight) - y;

    for (let c = 0; c < buffer.width; c++) {
      const ch = charRow[c] ?? ' ';
      const styleKey = styleRow[c] ?? 'bg';
      const styleDef = palette[styleKey];
      if (!styleDef) continue;

      // Edge-aligned integer columns: same technique, prevents vertical bars.
      const x = Math.round(c * cellWidth);
      const w =
        c === buffer.width - 1
          ? canvasWidth - x
          : Math.round((c + 1) * cellWidth) - x;
      const override = colorOverrides?.[`${r},${c}`];

      // Background
      const resolvedBg = override?.bg ?? (styleKey === BG_STYLE ? 'transparent' : (styleDef.bg ?? '#000000'));
      if (resolvedBg !== 'transparent') {
        ctx.fillStyle = resolvedBg;
        ctx.fillRect(x, y, w, h);
      }

      // Character (skip spaces for performance)
      if (ch !== ' ') {
        ctx.fillStyle = override?.color ?? styleDef.color;
        ctx.font = styleDef.fontWeight ? boldFont : normalFont;
        ctx.fillText(ch, x, y + baselineOffset);
      }
    }
  }

  return canvas;
}
