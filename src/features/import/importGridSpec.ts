import type { FigmiiDocument, FigmiiPage, Layer, LayerKind, LayerProperties, ComponentDef } from '@primitives/document-model/types.ts';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import type { Palette, StyleKey } from '@primitives/style-system/types.ts';
import type { GridSpec, GridSpecPage, GridSpecLayer } from '@features/export/gridspec/types.ts';

/**
 * Import a GridSpec JSON string back into a FigmiiDocument.
 *
 * GridSpec preserves raw layer `properties`, so this is near-lossless.
 * Only `customColors`, `cellColorOverrides`, and viewport scroll are lost.
 */
export function importGridSpec(json: string): FigmiiDocument {
  const parsed: unknown = JSON.parse(json);
  const schema = (parsed as { $schema?: unknown }).$schema;

  if (schema !== 'figmii-gridspec-v1' && schema !== 'figme-gridspec-v1') {
    throw new Error('Invalid GridSpec: missing or wrong $schema');
  }

  const spec = parsed as GridSpec;

  const gridConfig: GridConfig = {
    fontFamily: spec.grid.fontFamily,
    fontSize: spec.grid.fontSize,
    lineHeight: spec.grid.lineHeight,
    cellWidth: spec.grid.cellWidth,
    cellHeight: spec.grid.cellHeight,
    canvasCols: spec.grid.cols,
    canvasRows: spec.grid.rows,
  };

  const palette = spec.palette as Palette;

  const pages: FigmiiPage[] = spec.pages.map((specPage) =>
    rebuildPage(specPage),
  );

  const components: Record<string, ComponentDef> = {};
  for (const comp of spec.components) {
    components[comp.id] = {
      id: comp.id,
      name: comp.name,
      description: comp.description,
      sourceLayerIds: [...comp.sourceLayerIds],
    };
  }

  return {
    id: spec.document.id,
    name: spec.document.name,
    gridConfig,
    palette,
    pages,
    activePageId: pages[0]?.id ?? '',
    components,
    metadata: {
      createdAt: spec.document.createdAt,
      updatedAt: spec.document.updatedAt,
      version: spec.document.version,
    },
  };
}

function rebuildPage(specPage: GridSpecPage): FigmiiPage {
  const layers: Record<string, Layer> = {};
  const layerOrder: string[] = [];

  for (const specLayer of specPage.layers) {
    const layer = rebuildLayer(specLayer);
    layers[layer.id] = layer;
    layerOrder.push(layer.id);
  }

  return {
    id: specPage.id,
    name: specPage.name,
    layers,
    layerOrder,
    canvasColsOverride: specPage.gridOverride?.cols,
    canvasRowsOverride: specPage.gridOverride?.rows,
    canvasX: 0,
    canvasY: 0,
  };
}

function rebuildLayer(specLayer: GridSpecLayer): Layer {
  const layer: Layer = {
    id: specLayer.id,
    kind: specLayer.kind as LayerKind,
    name: specLayer.name,
    rect: {
      col: specLayer.gridRect.col,
      row: specLayer.gridRect.row,
      width: specLayer.gridRect.width,
      height: specLayer.gridRect.height,
    },
    visible: specLayer.visible,
    locked: specLayer.locked,
    opacity: specLayer.opacity,
    styleKey: specLayer.styleKey as StyleKey,
    properties: specLayer.properties as LayerProperties,
  };

  if (specLayer.parentId) {
    layer.parentId = specLayer.parentId;
  }
  if (specLayer.childIds && specLayer.childIds.length > 0) {
    layer.children = [...specLayer.childIds];
  }
  if (specLayer.autoLayout) {
    layer.autoLayout = { ...specLayer.autoLayout };
  }

  return layer;
}
