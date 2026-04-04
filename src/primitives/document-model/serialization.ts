import type { FigMeDocument } from './types.ts';

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
 *
 * Stub: uses JSON.parse. Real implementation will validate
 * the schema and handle version migration.
 */
export function deserializeDocument(json: string): FigMeDocument {
  return JSON.parse(json) as FigMeDocument;
}
