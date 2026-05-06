import type { FIGMIIDocument, FIGMIIPage, Layer } from './types.ts';
import { DOCUMENT_SCHEMA_VERSION } from './types.ts';
import { normalizeRuntimeMetadata } from '@primitives/runtime-semantics/defaults.ts';
import { migrateLegacyRuntimeAuthoring } from '@primitives/runtime-semantics/regionCompat.ts';

let migrationIdCounter = 0;

/**
 * Serialize a FIGMIIDocument to a JSON string.
 */
export function serializeDocument(doc: FIGMIIDocument): string {
  return JSON.stringify(migrateDocument(doc), null, 2);
}

/**
 * Deserialize a JSON string into a FIGMIIDocument.
 * Applies migrations for older document versions.
 */
export function deserializeDocument(json: string): FIGMIIDocument {
  const doc = JSON.parse(json) as FIGMIIDocument;
  return migrateDocument(doc);
}

/**
 * Ensure older documents load into the current additive schema.
 * Handles documents saved before background layers and runtime regions existed.
 */
export function migrateDocument(doc: FIGMIIDocument): FIGMIIDocument {
  const legacyMigration = migrateLegacyRuntimeAuthoring(doc);
  const migratedDoc = legacyMigration.document;
  let changed = legacyMigration.changed || migratedDoc.metadata.version !== DOCUMENT_SCHEMA_VERSION;

  const pages = migratedDoc.pages.map((page): FIGMIIPage => {
    let nextPage = page.runtime
      ? page
      : {
          ...page,
          runtime: {
            exportAsScreen: false,
            desktopBehavior: 'centered-mobile-canvas' as const,
          },
        };
    if (!page.runtime) changed = true;

    if (nextPage.regions === undefined) {
      changed = true;
      nextPage = {
        ...nextPage,
        regions: {},
        regionOrder: nextPage.regionOrder ?? [],
      };
    } else if (nextPage.regionOrder === undefined) {
      changed = true;
      nextPage = {
        ...nextPage,
        regionOrder: Object.keys(nextPage.regions),
      };
    }

    const layers: Record<string, Layer> = {};
    let strippedLayerRuntime = false;
    for (const [layerId, layer] of Object.entries(nextPage.layers)) {
      const { runtime: _runtime, ...cleanLayer } = layer as Layer & { runtime?: unknown };
      if (_runtime !== undefined) strippedLayerRuntime = true;
      layers[layerId] = cleanLayer;
    }
    if (strippedLayerRuntime) {
      changed = true;
      nextPage = { ...nextPage, layers };
    }

    const hasBackground = Object.values(nextPage.layers).some(
      (l: Layer | undefined) => l?.isBackground,
    );
    if (hasBackground) return nextPage;

    changed = true;
    const bgId = `layer_migrate_${Date.now()}_${++migrationIdCounter}`;
    const bgLayer: Layer = {
      id: bgId,
      kind: 'group',
      name: 'Background',
      rect: { col: 0, row: 0, width: 0, height: 0 },
      visible: true,
      locked: false,
      opacity: 1,
      styleKey: 'bg',
      children: [],
      isBackground: true,
      properties: {},
    };
    nextPage = {
      ...nextPage,
      layers: { ...nextPage.layers, [bgId]: bgLayer },
      layerOrder: [bgId, ...nextPage.layerOrder],
    };
    return nextPage;
  });

  const runtime = normalizeRuntimeMetadata(migratedDoc.runtime);
  if (!migratedDoc.runtime) changed = true;

  if (!changed) return { ...migratedDoc, runtime };

  return {
    ...migratedDoc,
    pages,
    runtime,
    metadata: {
      ...doc.metadata,
      version: DOCUMENT_SCHEMA_VERSION,
    },
  };
}
