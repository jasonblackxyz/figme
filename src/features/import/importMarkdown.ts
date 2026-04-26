import type {
  FIGMIIDocument,
  FIGMIIPage,
  Layer,
  LayerKind,
  LayerProperties,
  BorderBoxProperties,
  TextBlockProperties,
  FigletTextProperties,
  EdgePathProperties,
  ComponentInstanceProperties,
} from '@primitives/document-model/types.ts';
import type { StyleKey } from '@primitives/style-system/types.ts';
import { createEmptyDocument, createEmptyPage } from '@primitives/document-model/operations.ts';

/**
 * Import a Figmii-exported Markdown spec back into a FIGMIIDocument.
 *
 * Reconstructs layer shells (position, size, kind, style, visibility)
 * from the markdown table. Layer content is not preserved in markdown
 * exports, so imported layers have default/empty properties.
 */
export function importMarkdown(md: string): FIGMIIDocument {
  const lines = md.split('\n');

  const name = extractDocName(lines);
  const gridDims = extractGridDimensions(lines);

  const doc = createEmptyDocument(
    name,
    gridDims
      ? {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          lineHeight: 1.35,
          cellWidth: 8.4,
          cellHeight: 18.9,
          canvasCols: gridDims.cols,
          canvasRows: gridDims.rows,
        }
      : undefined,
  );

  const pages = parsePages(lines);

  if (pages.length === 0) {
    return doc;
  }

  return {
    ...doc,
    pages,
    activePageId: pages[0]!.id,
  };
}

function extractDocName(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1]!.trim();
  }
  return 'Imported';
}

function extractGridDimensions(lines: string[]): { cols: number; rows: number } | null {
  for (const line of lines) {
    const match = line.match(/\*\*Grid:\*\*\s*(\d+)\s*x\s*(\d+)/i);
    if (match) {
      return { cols: parseInt(match[1]!, 10), rows: parseInt(match[2]!, 10) };
    }
  }
  return null;
}

function parsePages(lines: string[]): FIGMIIPage[] {
  const pages: FIGMIIPage[] = [];
  let currentPageName: string | null = null;
  let tableRows: string[] = [];
  let headerSeen = false;
  let idCounter = 0;

  const flushPage = () => {
    if (currentPageName !== null) {
      const page = createEmptyPage(currentPageName);
      const layers = parseTableRows(tableRows, () => ++idCounter);
      const layerMap: Record<string, Layer> = {};
      const layerOrder: string[] = [];
      for (const layer of layers) {
        layerMap[layer.id] = layer;
        layerOrder.push(layer.id);
      }
      pages.push({ ...page, layers: layerMap, layerOrder });
    }
    tableRows = [];
    headerSeen = false;
  };

  for (const line of lines) {
    const pageMatch = line.match(/^##\s+(.+)/);
    if (pageMatch) {
      flushPage();
      currentPageName = pageMatch[1]!.trim();
      continue;
    }

    // Skip table header and separator rows
    if (line.match(/^\|\s*Name\s*\|/i)) {
      headerSeen = true;
      continue;
    }
    if (line.match(/^\|[-\s|]+\|$/)) {
      continue;
    }

    // Collect table data rows
    if (headerSeen && line.startsWith('|') && !line.includes('_(no layers)_')) {
      tableRows.push(line);
    }
  }

  flushPage();
  return pages;
}

function parseTableRows(rows: string[], nextId: () => number): Layer[] {
  const layers: Layer[] = [];

  for (const row of rows) {
    const cells = row
      .split('|')
      .slice(1, -1) // remove leading/trailing empty from split
      .map((c) => c.trim());

    if (cells.length < 6) continue;

    const [name, kindStr, posStr, sizeStr, styleKey, visStr] = cells as [string, string, string, string, string, string];

    const kind = kindStr as LayerKind;
    const [col, rowNum] = posStr.split(',').map(Number) as [number, number];
    const [width, height] = sizeStr.split('x').map(Number) as [number, number];
    const visible = visStr.toLowerCase() === 'yes';

    const properties = defaultPropertiesForKind(kind, styleKey);

    layers.push({
      id: `layer_${Date.now()}_${nextId()}`,
      kind,
      name,
      rect: { col, row: rowNum, width, height },
      visible,
      locked: false,
      opacity: 1,
      styleKey: styleKey as StyleKey,
      properties,
    });
  }

  return layers;
}

function defaultPropertiesForKind(kind: LayerKind, styleKey: string): LayerProperties {
  switch (kind) {
    case 'border-box':
      return {
        borderStyle: 'rounded',
        padding: { top: 1, right: 1, bottom: 1, left: 1 },
      } as BorderBoxProperties;
    case 'text-block':
      return {
        content: '',
        fontFamily: "'IBM Plex Mono', monospace",
        kerning: 0,
        lineSpacing: 0,
        alignment: 'left',
        styleKey,
      } as TextBlockProperties;
    case 'figlet-text':
      return {
        content: '',
        fontName: 'koholint',
        alignment: 'left',
        styleKey,
      } as FigletTextProperties;
    case 'edge-path':
      return {
        sourceLayerId: '',
        targetLayerId: '',
        routingStyle: 'manhattan',
        waypoints: [],
        styleKey,
      } as EdgePathProperties;
    case 'component':
      return { componentId: '' } as ComponentInstanceProperties;
    default:
      return {} as Record<string, never>;
  }
}
