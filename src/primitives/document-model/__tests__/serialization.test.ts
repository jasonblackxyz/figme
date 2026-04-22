import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../operations.ts';
import { deserializeDocument } from '../serialization.ts';

describe('deserializeDocument', () => {
  it('migrates pages missing backgroundColor to explicit white', () => {
    const legacy = createEmptyDocument('Legacy');
    delete legacy.pages[0]!.backgroundColor;

    const migrated = deserializeDocument(JSON.stringify(legacy));

    expect(migrated.pages[0]!.backgroundColor).toBe('#ffffff');
  });

  it('preserves explicit page background colors', () => {
    const doc = createEmptyDocument('Custom Background');
    doc.pages[0]!.backgroundColor = '#0d1117';

    const roundTripped = deserializeDocument(JSON.stringify(doc));

    expect(roundTripped.pages[0]!.backgroundColor).toBe('#0d1117');
  });

  it('adds both a background layer and white page background during legacy migration', () => {
    const legacy = createEmptyDocument('Legacy');
    const backgroundLayerId = legacy.pages[0]!.layerOrder[0]!;
    delete legacy.pages[0]!.layers[backgroundLayerId];
    legacy.pages[0]!.layerOrder = [];
    delete legacy.pages[0]!.backgroundColor;

    const migrated = deserializeDocument(JSON.stringify(legacy));
    const page = migrated.pages[0]!;
    const migratedBackground = page.layers[page.layerOrder[0]!]!;

    expect(page.backgroundColor).toBe('#ffffff');
    expect(migratedBackground.isBackground).toBe(true);
    expect(migratedBackground.name).toBe('Background');
  });
});
