import type { FigMeDocument, FigMePage, Layer } from './types.ts';

let migrationIdCounter = 0;

/**
 * Serialize a FigMeDocument to a JSON string.
 *
 * Stub: uses JSON.stringify. Real implementation may add
 * versioning, compression, or custom serialization logic.
 */
export function serializeDocument(doc: FigMeDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Deserialize a JSON string into a FigMeDocument.
 * Applies migrations for older document versions.
 */
export function deserializeDocument(json: string): FigMeDocument {
  const doc = JSON.parse(json) as FigMeDocument;
  return migrateDocument(doc);
}

/**
 * Ensure every page has a Background layer.
 * Handles documents saved before the layer hierarchy was introduced.
 */
function migrateDocument(doc: FigMeDocument): FigMeDocument {
  let changed = false;
  const pages = doc.pages.map((page): FigMePage => {
    const hasBackground = Object.values(page.layers).some(
      (l: Layer | undefined) => l?.isBackground,
    );
    if (hasBackground) return page;

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
    return {
      ...page,
      layers: { ...page.layers, [bgId]: bgLayer },
      layerOrder: [bgId, ...page.layerOrder],
    };
  });

  return changed ? { ...doc, pages } : doc;
}
