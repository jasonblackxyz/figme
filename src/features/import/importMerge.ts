import type { ComponentDef, FIGMIIDocument, FIGMIIPage, Layer, LayerProperties } from '@primitives/document-model/types.ts';

interface ImportIdCounters {
  page: number;
  component: number;
  layer: number;
}

export function mergeImportedDocuments(
  currentDoc: FIGMIIDocument,
  importedDocs: FIGMIIDocument[],
): FIGMIIDocument {
  if (importedDocs.length === 0) return currentDoc;

  const nextDoc = cloneValue(currentDoc);
  const usedPageIds = new Set(nextDoc.pages.map((page) => page.id));
  const usedPageNames = new Set(nextDoc.pages.map((page) => page.name));
  const usedComponentIds = new Set(Object.keys(nextDoc.components));
  const usedLayerIds = new Set(collectLayerIds(nextDoc));
  const counters: ImportIdCounters = { page: 0, component: 0, layer: 0 };
  let firstImportedPageId: string | null = null;

  for (const importedDoc of importedDocs) {
    const clonedDoc = cloneValue(importedDoc);
    const layerIdMap = new Map<string, string>();

    for (const page of clonedDoc.pages) {
      for (const layerId of Object.keys(page.layers)) {
        layerIdMap.set(layerId, createUniqueId('layer_import', usedLayerIds, counters, 'layer'));
      }
    }

    const componentIdMap = new Map<string, string>();
    for (const componentId of Object.keys(clonedDoc.components)) {
      componentIdMap.set(
        componentId,
        createUniqueId('comp_import', usedComponentIds, counters, 'component'),
      );
    }

    const remappedPages = clonedDoc.pages.map((page) =>
      remapImportedPage(page, layerIdMap, componentIdMap, usedPageIds, usedPageNames, counters),
    );
    const remappedComponents = remapImportedComponents(
      clonedDoc.components,
      componentIdMap,
      layerIdMap,
    );

    if (!firstImportedPageId && remappedPages[0]) {
      firstImportedPageId = remappedPages[0].id;
    }

    nextDoc.pages = [...nextDoc.pages, ...remappedPages];
    nextDoc.components = { ...nextDoc.components, ...remappedComponents };
  }

  if (firstImportedPageId) {
    nextDoc.activePageId = firstImportedPageId;
  }

  return nextDoc;
}

function remapImportedPage(
  page: FIGMIIPage,
  layerIdMap: Map<string, string>,
  componentIdMap: Map<string, string>,
  usedPageIds: Set<string>,
  usedPageNames: Set<string>,
  counters: ImportIdCounters,
): FIGMIIPage {
  const pageId = createUniqueId('page_import', usedPageIds, counters, 'page');
  const nextLayers: Record<string, Layer> = {};

  for (const [oldLayerId, layer] of Object.entries(page.layers)) {
    const nextLayerId = layerIdMap.get(oldLayerId) ?? oldLayerId;
    nextLayers[nextLayerId] = {
      ...layer,
      id: nextLayerId,
      children: layer.children?.map((childId) => layerIdMap.get(childId) ?? childId),
      parentId: layer.parentId ? layerIdMap.get(layer.parentId) ?? layer.parentId : undefined,
      properties: remapLayerProperties(layer.kind, layer.properties, layerIdMap, componentIdMap),
    };
  }

  return {
    ...page,
    id: pageId,
    name: createUniquePageName(page.name, usedPageNames),
    layers: nextLayers,
    layerOrder: page.layerOrder.map((layerId) => layerIdMap.get(layerId) ?? layerId),
  };
}

function remapLayerProperties(
  kind: Layer['kind'],
  properties: LayerProperties,
  layerIdMap: Map<string, string>,
  componentIdMap: Map<string, string>,
): LayerProperties {
  const cloned = cloneValue(properties);

  if (kind === 'component' && 'componentId' in cloned && typeof cloned.componentId === 'string') {
    const componentProperties = cloned as LayerProperties & { componentId: string };
    return {
      ...componentProperties,
      componentId: componentIdMap.get(componentProperties.componentId) ?? componentProperties.componentId,
    } as LayerProperties;
  }

  if (
    kind === 'edge-path'
    && 'sourceLayerId' in cloned
    && 'targetLayerId' in cloned
    && typeof cloned.sourceLayerId === 'string'
    && typeof cloned.targetLayerId === 'string'
  ) {
    const edgeProperties = cloned as LayerProperties & {
      sourceLayerId: string;
      targetLayerId: string;
    };
    return {
      ...edgeProperties,
      sourceLayerId: layerIdMap.get(edgeProperties.sourceLayerId) ?? edgeProperties.sourceLayerId,
      targetLayerId: layerIdMap.get(edgeProperties.targetLayerId) ?? edgeProperties.targetLayerId,
    } as LayerProperties;
  }

  return cloned;
}

function remapImportedComponents(
  components: Record<string, ComponentDef>,
  componentIdMap: Map<string, string>,
  layerIdMap: Map<string, string>,
): Record<string, ComponentDef> {
  const nextComponents: Record<string, ComponentDef> = {};

  for (const [componentId, component] of Object.entries(components)) {
    const nextComponentId = componentIdMap.get(componentId) ?? componentId;
    nextComponents[nextComponentId] = {
      ...component,
      id: nextComponentId,
      sourceLayerIds: component.sourceLayerIds.map(
        (layerId) => layerIdMap.get(layerId) ?? layerId,
      ),
    };
  }

  return nextComponents;
}

function createUniquePageName(name: string, usedPageNames: Set<string>): string {
  const baseName = name.trim() || 'Imported Page';
  if (!usedPageNames.has(baseName)) {
    usedPageNames.add(baseName);
    return baseName;
  }

  let suffix = 2;
  while (usedPageNames.has(`${baseName} (${suffix})`)) {
    suffix += 1;
  }

  const nextName = `${baseName} (${suffix})`;
  usedPageNames.add(nextName);
  return nextName;
}

function createUniqueId(
  prefix: string,
  usedIds: Set<string>,
  counters: ImportIdCounters,
  key: keyof ImportIdCounters,
): string {
  let nextId = '';
  do {
    counters[key] += 1;
    nextId = `${prefix}_${counters[key]}`;
  } while (usedIds.has(nextId));

  usedIds.add(nextId);
  return nextId;
}

function collectLayerIds(doc: FIGMIIDocument): string[] {
  return doc.pages.flatMap((page) => Object.keys(page.layers));
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
