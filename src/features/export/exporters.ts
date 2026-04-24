import type { FigMeDocument } from '@primitives/document-model/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import { getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';

/**
 * Serialize the full document as formatted JSON.
 */
export function exportAsJson(doc: FigMeDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Generate a self-contained HTML file that renders the grid buffer.
 * Each row becomes a <div> with <span> elements for styled character segments.
 */
export function exportAsHtml(
  doc: FigMeDocument,
  buffer: StampBuffer,
  gridConfig: GridConfig,
  colorOverrides?: ColorOverrideMap,
): string {
  const palette = doc.palette;
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0];
  const runtimeAnnotations = activePage
    ? Object.values(doc.runtime?.annotations ?? {}).filter((annotation) => annotation.pageId === activePage.id && annotation.export !== false)
    : [];

  let bodyRows = '';
  for (let r = 0; r < buffer.height; r++) {
    const row = buffer.chars[r];
    const styleRow = buffer.styles[r];
    if (!row || !styleRow) continue;

    let spans = '';
    let currentStyle = '';
    let segment = '';

    for (let c = 0; c < buffer.width; c++) {
      const ch = row[c] ?? ' ';
      const styleKey = styleRow[c] ?? 'bg';
      const styleDef = palette[styleKey];
      const override = colorOverrides?.[`${r},${c}`];
      const resolvedColor = override?.color ?? styleDef?.color ?? '#ffffff';
      const resolvedBg = override?.bg ?? styleDef?.bg ?? '#000000';
      const style = `color:${resolvedColor};background:${resolvedBg}${styleDef?.fontWeight ? `;font-weight:${styleDef.fontWeight}` : ''}`;

      if (style !== currentStyle) {
        if (segment) {
          spans += `<span style="${escapeAttr(currentStyle)}">${escapeHtml(segment)}</span>`;
        }
        currentStyle = style;
        segment = ch;
      } else {
        segment += ch;
      }
    }
    if (segment) {
      spans += `<span style="${escapeAttr(currentStyle)}">${escapeHtml(segment)}</span>`;
    }
    bodyRows += `<div class="row">${spans}</div>\n`;
  }

  const semanticOverlays = runtimeAnnotations.map((annotation) => {
    const attrs = [
      `data-annotation-id="${escapeAttr(annotation.id)}"`,
      `data-semantic-id="${escapeAttr(annotation.semanticId)}"`,
      annotation.role ? `data-role="${escapeAttr(annotation.role)}"` : '',
      annotation.componentId ? `data-component-id="${escapeAttr(annotation.componentId)}"` : '',
      annotation.componentKind ? `data-component-kind="${escapeAttr(annotation.componentKind)}"` : '',
      annotation.sourceLayerIds?.length ? `data-source-layer-ids="${escapeAttr(annotation.sourceLayerIds.join(','))}"` : '',
    ].filter(Boolean).join(' ');
    const style = [
      `left:${annotation.rect.col * gridConfig.cellWidth}px`,
      `top:${annotation.rect.row * gridConfig.cellHeight}px`,
      `width:${annotation.rect.width * gridConfig.cellWidth}px`,
      `height:${annotation.rect.height * gridConfig.cellHeight}px`,
    ].join(';');
    return `<div class="semantic-region" ${attrs} style="${style}"></div>`;
  }).join('\n');

  const runtimeJson = JSON.stringify({
    pageId: activePage?.id,
    annotations: runtimeAnnotations,
    runtime: doc.runtime,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.name)}</title>
<style>
body {
  margin: 0;
  padding: 16px;
  background: ${palette.bg.bg};
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: ${gridConfig.fontSize}px;
  line-height: ${gridConfig.lineHeight};
}
.grid { white-space: pre; position: relative; width: ${gridConfig.canvasCols * gridConfig.cellWidth}px; }
.row { height: ${gridConfig.cellHeight}px; }
.semantic-layer { position: absolute; inset: 0; pointer-events: none; }
.semantic-region {
  position: absolute;
  border: 1px dashed rgba(255,255,255,0.6);
  box-sizing: border-box;
}
</style>
</head>
<body>
<div class="grid">
${bodyRows}<div class="semantic-layer" aria-hidden="true">
${semanticOverlays}
</div>
<script type="application/json" data-runtime-semantics>${escapeJsonScript(runtimeJson)}</script>
</div>
</body>
</html>`;
}

/**
 * Generate a Markdown table summarizing all layers in the document.
 */
export function exportAsMarkdown(doc: FigMeDocument): string {
  let md = `# ${doc.name}\n\n`;
  md += `- **Pages:** ${doc.pages.length}\n`;
  md += `- **Default Grid:** ${doc.gridConfig.canvasCols} x ${doc.gridConfig.canvasRows} cells\n\n`;

  for (const page of doc.pages) {
    const canvasSize = getPageCanvasSizeInfo(page, doc.gridConfig);
    md += `## ${page.name}\n\n`;
    md += `- **Canvas:** ${canvasSize.effectiveCols} x ${canvasSize.effectiveRows} cells (${canvasSize.isOverridden ? 'custom' : 'default'})\n\n`;
    md += `| Name | Kind | Position | Size | Style | Visible |\n`;
    md += `|------|------|----------|------|-------|---------|\n`;

    for (const layerId of flattenLayerOrder(page)) {
      const layer = page.layers[layerId];
      if (!layer) continue;
      md += `| ${layer.name} | ${layer.kind} | ${layer.rect.col},${layer.rect.row} | ${layer.rect.width}x${layer.rect.height} | ${layer.styleKey} | ${layer.visible ? 'Yes' : 'No'} |\n`;
    }

    if (flattenLayerOrder(page).length === 0) {
      md += `| _(no layers)_ | | | | | |\n`;
    }
    md += `\n`;
  }

  return md;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;');
}

function escapeJsonScript(str: string): string {
  return str
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
