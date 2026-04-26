import type { FIGMIIDocument, FIGMIIPage, Layer } from './types.ts';
import { DOCUMENT_SCHEMA_VERSION } from './types.ts';
import { normalizeRuntimeMetadata } from '@primitives/runtime-semantics/defaults.ts';

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
  let changed = doc.metadata.version !== DOCUMENT_SCHEMA_VERSION;
  const pages = doc.pages.map((page): FIGMIIPage => {
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

  const runtime = normalizeRuntimeMetadata(doc.runtime);
  if (!doc.runtime) changed = true;

  if (!changed) return { ...doc, runtime };

  return {
    ...doc,
    pages,
    runtime,
    metadata: {
      ...doc.metadata,
      version: DOCUMENT_SCHEMA_VERSION,
    },
  };
}
