import type {
  FIGMIIDocument,
  BorderBoxProperties,
  TextBlockProperties,
  FigletTextProperties,
  EdgePathProperties,
  ComponentDef,
  ComponentInstanceProperties,
  Layer,
} from '@primitives/document-model/types.ts';
import { flattenLayerOrder } from '@primitives/document-model/hierarchy.ts';
import type { Palette, StyleDef } from '@primitives/style-system/types.ts';
import type { StampBuffer } from '@primitives/stamp-system/types.ts';
import { BORDER_CHARS } from '@primitives/stamp-system/stamps.ts';
import { composePageBuffer } from '@primitives/stamp-system/composeBuffer.ts';
import { computeColorOverrides, type ColorOverrideMap } from '@primitives/document-model/colorOverrides.ts';
import { applyPageCanvasSizeToGridConfig, getPageCanvasSizeInfo } from '@primitives/document-model/canvasSize.ts';
import type { GridSpec, GridSpecPage, GridSpecLayer, GridSpecResolved, GridSpecComponent, GridSpecCompactBuffer } from './types.ts';

export interface GridSpecExportOptions {
  includeBuffer?: boolean;
}

const FALLBACK_STYLE: StyleDef = { color: '#888', bg: '#000' };

function resolveStyle(palette: Palette, key: string | undefined): StyleDef | undefined {
  if (!key) return undefined;
  return (palette as Record<string, StyleDef>)[key] ?? undefined;
}

function findLayerName(doc: FIGMIIDocument, layerId: string): string {
  for (const page of doc.pages) {
    const layer = page.layers[layerId];
    if (layer) return layer.name;
  }
  return layerId;
}

function resolveComponentDefinition(layer: Layer, doc: FIGMIIDocument): ComponentDef | undefined {
  const properties = layer.properties as Partial<ComponentInstanceProperties>;
  const componentId = typeof properties.componentId === 'string' ? properties.componentId : undefined;
  if (!componentId) return undefined;
  return doc.components[componentId];
}

/**
 * Export a FIGMIIDocument as a structured GridSpec object.
 */
export function exportAsGridSpec(doc: FIGMIIDocument, options?: GridSpecExportOptions): GridSpec {
  const { gridConfig, palette } = doc;
  const includeBuffer = options?.includeBuffer ?? false;

  const pages: GridSpecPage[] = doc.pages.map((page) => {
    const canvasSize = getPageCanvasSizeInfo(page, gridConfig);

    const layers: GridSpecLayer[] = flattenLayerOrder(page)
      .map((id) => page.layers[id])
      .filter((layer): layer is Layer => layer != null)
      .map((layer) => buildSpecLayer(layer, page.layers, doc));

    const specPage: GridSpecPage = {
      id: page.id,
      name: page.name,
      ...(canvasSize.isOverridden ? {
        gridOverride: {
          cols: canvasSize.effectiveCols,
          rows: canvasSize.effectiveRows,
        },
      } : {}),
      layers,
      ...(page.runtime ? { runtime: page.runtime } : {}),
    };

    if (includeBuffer) {
      const pageGridConfig = applyPageCanvasSizeToGridConfig(page, gridConfig);
      const buffer = composePageBuffer(page, pageGridConfig);
      const overrides = computeColorOverrides(page);
      specPage.buffer = buildCompactBuffer(buffer, palette as Palette, overrides);
    }

    return specPage;
  });

  const components: GridSpecComponent[] = Object.values(doc.components).map((comp) => ({
    id: comp.id,
    name: comp.name,
    description: comp.description,
    sourceLayerIds: [...comp.sourceLayerIds],
    sourceLayerNames: comp.sourceLayerIds
      .map((id) => findLayerName(doc, id)),
  }));

  return {
    $schema: 'figmii-gridspec-v1',
    document: {
      id: doc.id,
      name: doc.name,
      createdAt: doc.metadata.createdAt,
      updatedAt: doc.metadata.updatedAt,
      version: doc.metadata.version,
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
    ...(doc.runtime ? { runtime: doc.runtime } : {}),
  };
}

/**
 * Export as formatted JSON string.
 */
export function exportGridSpecAsJson(doc: FIGMIIDocument, options?: GridSpecExportOptions): string {
  return JSON.stringify(exportAsGridSpec(doc, options), null, 2);
}

function buildCompactBuffer(
  buffer: StampBuffer,
  palette: Palette,
  colorOverrides: ColorOverrideMap,
): GridSpecCompactBuffer {
  const paletteEntries: StyleDef[] = [];
  const signatureToIndex = new Map<string, number>();

  const chars: string[] = [];
  const colorMap: number[][] = [];

  for (let r = 0; r < buffer.height; r++) {
    const charRow = buffer.chars[r];
    const styleRow = buffer.styles[r];
    chars.push(charRow ? charRow.join('') : '');

    const indexRow: number[] = [];
    for (let c = 0; c < buffer.width; c++) {
      const styleKey = styleRow?.[c];
      const styleDef = resolveStyle(palette, styleKey);
      const override = colorOverrides[`${r},${c}`];

      const color = override?.color ?? styleDef?.color ?? '#ffffff';
      const bg = override?.bg ?? styleDef?.bg ?? '#000000';
      const fontWeight = styleDef?.fontWeight;

      const sig = `${color}|${bg}|${fontWeight ?? ''}`;
      let idx = signatureToIndex.get(sig);
      if (idx === undefined) {
        idx = paletteEntries.length;
        signatureToIndex.set(sig, idx);
        const entry: StyleDef = { color, bg };
        if (fontWeight) entry.fontWeight = fontWeight;
        paletteEntries.push(entry);
      }
      indexRow.push(idx);
    }
    colorMap.push(indexRow);
  }

  return { chars, colorPalette: paletteEntries, colorMap };
}

function buildSpecLayer(
  layer: Layer,
  allLayers: Record<string, Layer>,
  doc: FIGMIIDocument,
): GridSpecLayer {
  const { gridConfig, palette } = doc;
  const { rect } = layer;

  const childIds = layer.children ? [...layer.children] : undefined;
  const parentName = layer.parentId ? allLayers[layer.parentId]?.name : undefined;
  const childNames = childIds
    ?.map((id) => allLayers[id]?.name)
    .filter((n): n is string => n != null);

  const resolved = buildResolved(layer, allLayers, doc);

  return {
    id: layer.id,
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
    ...(layer.parentId ? { parentId: layer.parentId } : {}),
    ...(parentName ? { parentName } : {}),
    ...(childIds && childIds.length > 0 ? { childIds } : {}),
    ...(childNames && childNames.length > 0 ? { childNames } : {}),
    ...(layer.autoLayout ? { autoLayout: layer.autoLayout } : {}),
    properties: layer.properties as Record<string, unknown>,
    ...(layer.runtime ? { runtime: layer.runtime } : {}),
    resolved,
  };
}

function buildResolved(
  layer: Layer,
  allLayers: Record<string, Layer>,
  doc: FIGMIIDocument,
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
      resolved.sourceLayerId = props.sourceLayerId;
      resolved.sourceLayerName = sourceLyr?.name ?? props.sourceLayerId;
      resolved.targetLayerId = props.targetLayerId;
      resolved.targetLayerName = targetLyr?.name ?? props.targetLayerId;
      break;
    }
    case 'component': {
      const comp = resolveComponentDefinition(layer, doc);
      if (comp) {
        resolved.componentDef = {
          id: comp.id,
          name: comp.name,
          description: comp.description,
          sourceLayerIds: [...comp.sourceLayerIds],
          sourceLayerNames: comp.sourceLayerIds
            .map((id) => findLayerName(doc, id)),
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
