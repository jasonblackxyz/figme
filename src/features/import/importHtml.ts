import type { FigMeDocument } from '@primitives/document-model/types.ts';
import type { Palette, StyleKey } from '@primitives/style-system/types.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

/**
 * Import a FigMe-exported HTML file back into a FigMeDocument.
 *
 * Parses the character grid and inline styles from <span> elements,
 * reverse-maps styles to palette keys, and creates a document with
 * a single text-block layer containing the reconstructed text.
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

  // Build reverse palette lookup: "color;bg;fontWeight" → styleKey
  const reversePalette = buildReversePalette(doc.palette);

  // Parse character grid from rows
  const rows = htmlDoc.querySelectorAll('.row');
  const lines: string[] = [];

  for (const row of rows) {
    let line = '';
    const spans = row.querySelectorAll('span');
    for (const span of spans) {
      line += span.textContent ?? '';
    }
    lines.push(line);
  }

  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') {
    lines.pop();
  }

  const content = lines.join('\n');

  if (content.trim().length === 0) {
    return doc;
  }

  // Find content bounding box (skip empty margins)
  let minCol = Infinity;
  let maxCol = 0;
  let minRow = Infinity;
  let maxRow = 0;

  for (let r = 0; r < lines.length; r++) {
    const line = lines[r]!;
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== ' ') {
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
      }
    }
  }

  if (minCol === Infinity) {
    return doc;
  }

  // Extract the bounded content
  const boundedLines: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const line = lines[r] ?? '';
    boundedLines.push(line.slice(minCol, maxCol + 1));
  }
  const boundedContent = boundedLines.join('\n');

  // Determine the dominant style key from the spans
  const styleKey = findDominantStyleKey(htmlDoc, reversePalette);

  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;

  const page = doc.pages[0]!;
  const layerId = `layer_${Date.now()}_1`;
  const layer = {
    id: layerId,
    kind: 'text-block' as const,
    name: 'Imported Content',
    rect: { col: minCol, row: minRow, width, height },
    visible: true,
    locked: false,
    opacity: 1,
    styleKey,
    properties: {
      content: boundedContent,
      fontFamily: gridConfig.fontFamily,
      kerning: 0 as const,
      lineSpacing: 0 as const,
      alignment: 'left' as const,
      styleKey,
    },
  };

  const updatedPage = {
    ...page,
    layers: { [layerId]: layer },
    layerOrder: [layerId],
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
    map.set(sig, key as StyleKey);
  }
  return map;
}

function findDominantStyleKey(htmlDoc: Document, reversePalette: ReversePalette): StyleKey {
  const counts = new Map<string, number>();

  const spans = htmlDoc.querySelectorAll('.row span');
  for (const span of spans) {
    const text = span.textContent ?? '';
    if (text.trim().length === 0) continue;

    const style = (span as HTMLElement).getAttribute('style') ?? '';
    const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
    const bgMatch = style.match(/background:\s*([^;]+)/);
    const fwMatch = style.match(/font-weight:\s*([^;]+)/);

    const color = colorMatch?.[1]?.trim() ?? '';
    const bg = bgMatch?.[1]?.trim() ?? '';
    const fw = fwMatch?.[1]?.trim() ?? '';

    const sig = `${color};${bg};${fw}`;
    const key = reversePalette.get(sig);
    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + text.length);
    }
  }

  let best: StyleKey = 'text';
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key as StyleKey;
      bestCount = count;
    }
  }

  return best;
}
