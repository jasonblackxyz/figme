import type { FigMeDocument, BorderBoxProperties, TextBlockProperties, FigletTextProperties, EdgePathProperties, Layer } from '@primitives/document-model/types.ts';
import type { Palette, StyleDef } from '@primitives/style-system/types.ts';
import { BORDER_CHARS } from '@primitives/stamp-system/stamps.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import type { GridSpec, GridSpecPage, GridSpecLayer, GridSpecResolved, GridSpecComponent } from './types.ts';

export interface GridSpecExportOptions {
  includeBuffer?: boolean;
}

const FALLBACK_STYLE: StyleDef = { color: '#888', bg: '#000' };

function resolveStyle(palette: Palette, key: string | undefined): StyleDef | undefined {
  if (!key) return undefined;
  return (palette as Record<string, StyleDef>)[key] ?? undefined;
}

/**
 * Export a FigMeDocument as a structured GridSpec object.
 */
export function exportAsGridSpec(doc: FigMeDocument, options?: GridSpecExportOptions): GridSpec {
  const { gridConfig, palette } = doc;
  const includeBuffer = options?.includeBuffer ?? false;

  const pages: GridSpecPage[] = doc.pages.map((page) => {
    const cols = page.canvasColsOverride ?? gridConfig.canvasCols;
    const rows = page.canvasRowsOverride ?? gridConfig.canvasRows;
    const hasOverride = page.canvasColsOverride != null || page.canvasRowsOverride != null;

    const layers: GridSpecLayer[] = page.layerOrder
      .map((id) => page.layers[id])
      .filter((layer): layer is Layer => layer != null)
      .map((layer) => buildSpecLayer(layer, page.layers, doc));

    const specPage: GridSpecPage = {
      name: page.name,
      ...(hasOverride ? { gridOverride: { cols, rows } } : {}),
      layers,
    };

    if (includeBuffer) {
      const pageGridConfig = {
        ...gridConfig,
        canvasCols: cols,
        canvasRows: rows,
      };
      const buffer = composePageBuffer(page, pageGridConfig);
      specPage.buffer = {
        chars: buffer.chars,
        styles: buffer.styles as string[][],
      };
    }

    return specPage;
  });

  const components: GridSpecComponent[] = Object.values(doc.components).map((comp) => ({
    name: comp.name,
    description: comp.description,
    sourceLayerNames: comp.sourceLayerIds
      .map((id) => {
        // Search all pages for the layer
        for (const page of doc.pages) {
          const layer = page.layers[id];
          if (layer) return layer.name;
        }
        return id; // fallback to ID if not found
      }),
  }));

  return {
    $schema: 'figme-gridspec-v1',
    document: {
      name: doc.name,
      createdAt: doc.metadata.createdAt,
      updatedAt: doc.metadata.updatedAt,
    },
    grid: {
      fontFamily: gridConfig.fontFamily,
      fontSize: gridConfig.fontSize,
      lineHeight: gridConfig.lineHeight,
      cellWidth: gridConfig.cellWidth,
      cellHeight: gridConfig.cellHeight,
      cols: gridConfig.canvasCols,
      rows: gridConfig.canvasRows,
      pixelWidth: gridConfig.canvasCols * gridConfig.cellWidth,
      pixelHeight: gridConfig.canvasRows * gridConfig.cellHeight,
    },
    palette: palette as Record<string, StyleDef>,
    pages,
    components,
  };
}

/**
 * Export as formatted JSON string.
 */
export function exportGridSpecAsJson(doc: FigMeDocument, options?: GridSpecExportOptions): string {
  return JSON.stringify(exportAsGridSpec(doc, options), null, 2);
}

function buildSpecLayer(
  layer: Layer,
  allLayers: Record<string, Layer>,
  doc: FigMeDocument,
): GridSpecLayer {
  const { gridConfig, palette } = doc;
  const { rect } = layer;

  const parentName = layer.parentId ? allLayers[layer.parentId]?.name : undefined;
  const childNames = layer.children
    ?.map((id) => allLayers[id]?.name)
    .filter((n): n is string => n != null);

  const resolved = buildResolved(layer, allLayers, doc);

  return {
    name: layer.name,
    kind: layer.kind,
    gridRect: { col: rect.col, row: rect.row, width: rect.width, height: rect.height },
    pixelBounds: {
      x: rect.col * gridConfig.cellWidth,
      y: rect.row * gridConfig.cellHeight,
      width: rect.width * gridConfig.cellWidth,
      height: rect.height * gridConfig.cellHeight,
    },
    styleKey: layer.styleKey,
    resolvedStyle: resolveStyle(palette, layer.styleKey) ?? FALLBACK_STYLE,
    visible: layer.visible,
    locked: layer.locked,
    opacity: layer.opacity,
    ...(parentName ? { parentName } : {}),
    ...(childNames && childNames.length > 0 ? { childNames } : {}),
    ...(layer.autoLayout ? { autoLayout: layer.autoLayout } : {}),
    properties: layer.properties as Record<string, unknown>,
    resolved,
  };
}

function buildResolved(
  layer: Layer,
  allLayers: Record<string, Layer>,
  doc: FigMeDocument,
): GridSpecResolved {
  const { palette } = doc;
  const resolved: GridSpecResolved = {};

  switch (layer.kind) {
    case 'border-box': {
      const props = layer.properties as BorderBoxProperties;
      // Resolve border characters
      if (props.borderStyle === 'custom' && props.borderChars) {
        resolved.borderChars = { ...props.borderChars };
      } else {
        const charSet = BORDER_CHARS[props.borderStyle as keyof typeof BORDER_CHARS];
        if (charSet) {
          resolved.borderChars = { ...charSet };
        }
      }
      // Resolve sub-styles
      const bgStyle = resolveStyle(palette, props.bgStyleKey);
      if (bgStyle) resolved.bgStyle = bgStyle;
      const titleStyle = resolveStyle(palette, props.titleStyleKey);
      if (titleStyle) resolved.titleStyle = titleStyle;
      break;
    }
    case 'text-block': {
      const props = layer.properties as TextBlockProperties;
      const textStyle = resolveStyle(palette, props.styleKey);
      if (textStyle) resolved.textStyle = textStyle;
      const headingStyle = resolveStyle(palette, props.headingStyleKey);
      if (headingStyle) resolved.headingStyle = headingStyle;
      const boldStyle = resolveStyle(palette, props.boldStyleKey);
      if (boldStyle) resolved.boldStyle = boldStyle;
      break;
    }
    case 'figlet-text': {
      const props = layer.properties as FigletTextProperties;
      const textStyle = resolveStyle(palette, props.styleKey);
      if (textStyle) resolved.textStyle = textStyle;
      break;
    }
    case 'edge-path': {
      const props = layer.properties as EdgePathProperties;
      const sourceLyr = allLayers[props.sourceLayerId];
      const targetLyr = allLayers[props.targetLayerId];
      resolved.sourceLayerName = sourceLyr?.name ?? props.sourceLayerId;
      resolved.targetLayerName = targetLyr?.name ?? props.targetLayerId;
      break;
    }
    case 'component': {
      // Find component definition — search by matching sourceLayerIds
      const comp = Object.values(doc.components).find((c) =>
        c.sourceLayerIds.includes(layer.id),
      );
      if (comp) {
        resolved.componentDef = {
          name: comp.name,
          description: comp.description,
          sourceLayerNames: comp.sourceLayerIds
            .map((id) => {
              for (const page of doc.pages) {
                const lyr = page.layers[id];
                if (lyr) return lyr.name;
              }
              return id;
            }),
        };
      }
      break;
    }
    default:
      // No resolution needed — properties pass-through is sufficient
      break;
  }

  return resolved;
}
