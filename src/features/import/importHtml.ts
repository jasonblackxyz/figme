import type { FigMeDocument, Layer } from '@primitives/document-model/types.ts';
import type { Palette, StyleKey } from '@primitives/style-system/types.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

/**
 * Import a FigMe-exported HTML file back into a FigMeDocument.
 *
 * Parses the character grid and inline styles from <span> elements
 * and rebuilds one literal text-block layer per styled HTML span.
 */
export function importHtml(html: string): FigMeDocument {
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(html, 'text/html');

  // Extract grid config from CSS
  const gridConfig = extractGridConfig(htmlDoc);

  // Extract title
  const title = htmlDoc.querySelector('title')?.textContent ?? 'Imported';

  // Create document with extracted config
  const doc = createEmptyDocument(title, gridConfig);

  // Build reverse palette lookup: "color;bg;fontWeight" -> styleKey
  const reversePalette = buildReversePalette(doc.palette);
  const rows = htmlDoc.querySelectorAll('.row');
  const page = doc.pages[0]!;
  const layers: Record<string, Layer> = {};
  const layerOrder: string[] = [];
  let hasVisibleContent = false;
  let nextLayerId = 1;
  const defaultBg = normalizeStyleValue(doc.palette.bg.bg);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    let col = 0;

    for (const span of row.querySelectorAll('span')) {
      const text = span.textContent ?? '';
      if (text.length === 0) continue;

      if (!hasVisibleContent && text.trim().length > 0) {
        hasVisibleContent = true;
      }

      const { styleKey, customColors, bg } = resolveSpanStyle(span, reversePalette, doc.palette);
      if (text.trim().length === 0 && normalizeStyleValue(bg) === defaultBg) {
        col += text.length;
        continue;
      }

      const layerId = `layer_${Date.now()}_${nextLayerId++}`;
      const layer: Layer = {
        id: layerId,
        kind: 'text-block',
        name: `Imported Row ${rowIndex + 1} Segment ${nextLayerId - 1}`,
        rect: { col, row: rowIndex, width: text.length, height: 1 },
        visible: true,
        locked: false,
        opacity: 1,
        styleKey,
        ...(customColors ? { customColors } : {}),
        properties: {
          content: text,
          fontFamily: gridConfig.fontFamily,
          kerning: 0,
          lineSpacing: 0,
          alignment: 'left',
          styleKey,
          renderMode: 'literal',
        },
      };

      layers[layerId] = layer;
      layerOrder.push(layerId);
      col += text.length;
    }
  }

  if (!hasVisibleContent) {
    return doc;
  }

  const updatedPage = {
    ...page,
    layers,
    layerOrder,
  };

  return {
    ...doc,
    pages: [updatedPage],
  };
}

function extractGridConfig(htmlDoc: Document) {
  const style = htmlDoc.querySelector('style')?.textContent ?? '';

  const fontFamilyMatch = style.match(/font-family:\s*([^;]+)/);
  const fontSizeMatch = style.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
  const lineHeightMatch = style.match(/line-height:\s*(\d+(?:\.\d+)?)/);
  const rowHeightMatch = style.match(/\.row\s*\{[^}]*height:\s*(\d+(?:\.\d+)?)px/);

  const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]!) : 14;
  const lineHeight = lineHeightMatch ? parseFloat(lineHeightMatch[1]!) : 1.35;
  const cellHeight = rowHeightMatch ? parseFloat(rowHeightMatch[1]!) : 18.9;
  const cellWidth = cellHeight / lineHeight * 0.444; // approximate mono char ratio

  // Count grid dimensions from content
  const rows = htmlDoc.querySelectorAll('.row');
  const canvasRows = rows.length || 57;
  let canvasCols = 228;
  for (const row of rows) {
    let len = 0;
    for (const span of row.querySelectorAll('span')) {
      len += (span.textContent ?? '').length;
    }
    canvasCols = Math.max(canvasCols, len);
  }

  return {
    fontFamily: fontFamilyMatch ? fontFamilyMatch[1]!.trim() : "'IBM Plex Mono', monospace",
    fontSize,
    lineHeight,
    cellWidth,
    cellHeight,
    canvasCols,
    canvasRows,
  };
}

type ReversePalette = Map<string, StyleKey>;

function buildReversePalette(palette: Palette): ReversePalette {
  const map = new Map<string, StyleKey>();
  for (const [key, def] of Object.entries(palette)) {
    const sig = `${def.color};${def.bg};${def.fontWeight ?? ''}`;
    // First-occurrence wins: when multiple style keys share the same signature
    // (e.g. 'text' and 'queryText' both resolve to '#1a1a1a;transparent;'),
    // prefer whichever appears first in palette iteration order.
    if (!map.has(sig)) map.set(sig, key as StyleKey);
  }
  return map;
}

function resolveSpanStyle(
  span: Element,
  reversePalette: ReversePalette,
  palette: Palette,
): { styleKey: StyleKey; bg: string; customColors?: { color?: string; bg?: string } } {
  const style = (span as HTMLElement).getAttribute('style') ?? '';
  const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
  const bgMatch = style.match(/(?:^|;)\s*background(?:-color)?:\s*([^;]+)/);
  const fwMatch = style.match(/(?:^|;)\s*font-weight:\s*([^;]+)/);

  const color = normalizeStyleValue(colorMatch?.[1] ?? '');
  const bg = normalizeStyleValue(bgMatch?.[1] ?? '');
  const fontWeight = fwMatch?.[1]?.trim() ?? '';

  const sig = `${color};${bg};${fontWeight}`;
  const matchedStyleKey = reversePalette.get(sig);
  if (matchedStyleKey) {
    return { styleKey: matchedStyleKey, bg };
  }

  const styleKey = pickFallbackStyleKey(fontWeight);
  const paletteStyle = palette[styleKey];
  const customColors = {
    ...(color && color !== normalizeStyleValue(paletteStyle.color) ? { color } : {}),
    ...(bg && bg !== normalizeStyleValue(paletteStyle.bg) ? { bg } : {}),
  };

  return {
    styleKey,
    bg,
    ...(Object.keys(customColors).length > 0 ? { customColors } : {}),
  };
}

function pickFallbackStyleKey(fontWeight: string): StyleKey {
  const numericWeight = Number.parseInt(fontWeight, 10);
  if (!Number.isNaN(numericWeight) && numericWeight >= 700) {
    return 'textBold';
  }
  return 'text';
}

function normalizeStyleValue(value: string): string {
  return value.trim().toLowerCase();
}
