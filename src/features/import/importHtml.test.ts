import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { renderGridToElements } from '@renderer/renderGrid.ts';
import { importHtml } from './importHtml.ts';

function makeHtml(rows: string[], pageBackground = '#ffffff'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Imported</title>
<style>
body {
  margin: 0;
  padding: 16px;
  background: #1a1a2e;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.35;
}
.grid { white-space: pre; }
.row { height: 18.9px; }
</style>
</head>
<body>
<div class="page" style="background:${pageBackground}">
<div class="grid">
${rows.join('\n')}
</div>
</div>
</body>
</html>`;
}

function buildColorOverrides(page: ReturnType<typeof importHtml>['pages'][number]) {
  const overrides: Record<string, { color?: string; bg?: string }> = {};

  for (const layerId of page.layerOrder) {
    const layer = page.layers[layerId];
    if (!layer?.customColors) continue;

    const { col, row, width, height } = layer.rect;
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        overrides[`${r},${c}`] = {
          ...overrides[`${r},${c}`],
          ...layer.customColors,
        };
      }
    }
  }

  return overrides;
}

describe('importHtml', () => {
  it('preserves literal grid text without markdown reflow or leading-space loss', () => {
    const text = '  # keep **stars**';
    const html = makeHtml([
      `<div class="row"><span style="color:#e0e0e0;background:#1a1a2e">${text}</span></div>`,
    ]);

    const doc = importHtml(html);
    const page = doc.pages[0]!;
    const buffer = composePageBuffer(page, doc.gridConfig);

    expect(page.layerOrder).toHaveLength(1);
    expect(buffer.chars[0]!.slice(0, text.length).join('')).toBe(text);
  });

  it('preserves mixed span styling instead of collapsing to one dominant style', () => {
    const palette = createEmptyDocument('Palette').palette;
    const text = palette.text;
    const bold = palette.textBold;
    const html = makeHtml([
      `<div class="row"><span style="color:${text.color};background:${text.bg}">AA</span><span style="color:${bold.color};background:${bold.bg};font-weight:${bold.fontWeight}">BB</span></div>`,
    ]);

    const doc = importHtml(html);
    const page = doc.pages[0]!;
    const buffer = composePageBuffer(page, doc.gridConfig);
    const rows = renderGridToElements(buffer, doc.palette, buildColorOverrides(page));

    expect(page.layerOrder).toHaveLength(2);
    expect(page.layers[page.layerOrder[1]!]!.styleKey).toBe('textBold');
    expect(rows[0]!.spans).toHaveLength(2);
    expect(rows[0]!.spans[0]).toMatchObject({
      text: 'AA',
      color: text.color,
      bg: text.bg,
    });
    expect(rows[0]!.spans[1]).toMatchObject({
      text: 'BB',
      color: bold.color,
      bg: bold.bg,
      fontWeight: bold.fontWeight,
    });
  });

  it('preserves explicit page background color and skips transparent whitespace spans', () => {
    const html = makeHtml([
      `<div class="row"><span style="color:#1a1a1a;background:transparent">   </span><span style="color:#e0e0e0;background:#1a1a2e">X</span></div>`,
    ], '#0d1117');

    const doc = importHtml(html);
    const page = doc.pages[0]!;

    expect(page.backgroundColor).toBe('#0d1117');
    expect(page.layerOrder).toHaveLength(1);
    expect(page.layers[page.layerOrder[0]!]!.properties).toMatchObject({
      content: 'X',
    });
  });
});
