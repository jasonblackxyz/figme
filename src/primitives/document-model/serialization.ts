import type { FigmiiDocument, FigmiiPage, Layer } from './types.ts';
import { normalizeRuntimeMetadata } from '@primitives/runtime-semantics/defaults.ts';

let migrationIdCounter = 0;

/**
 * Serialize a FigmiiDocument to a JSON string.
 *
 * Stub: uses JSON.stringify. Real implementation may add
 * versioning, compression, or custom serialization logic.
 */
export function serializeDocument(doc: FigmiiDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Deserialize a JSON string into a FigmiiDocument.
 * Applies migrations for older document versions.
 */
export function deserializeDocument(json: string): FigmiiDocument {
  const doc = JSON.parse(json) as FigmiiDocument;
  return migrateDocument(doc);
}

/**
 * Ensure every page has a Background layer.
 * Handles documents saved before the layer hierarchy was introduced.
 */
function migrateDocument(doc: FigmiiDocument): FigmiiDocument {
  let changed = false;
  const pages = doc.pages.map((page): FigmiiPage => {
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

    const hasBackground = Object.values(page.layers).some(
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

  return changed ? { ...doc, pages, runtime } : { ...doc, runtime };
}
