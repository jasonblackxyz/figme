import 'fake-indexeddb/auto';
import {
  saveToDB,
  loadLatestFromDB,
  clearDB,
  saveToLocalStorage,
  loadFromLocalStorage,
  loadPersistedDocument,
} from '../persistenceDb.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

// Provide a minimal localStorage mock for forks pool mode
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(async () => {
  await clearDB();
  delete store['figme_autosave'];
});

describe('IndexedDB persistence', () => {
  it('saves and loads a document', async () => {
    const doc = createEmptyDocument('Test Doc');
    await saveToDB(doc);
    const loaded = await loadLatestFromDB();
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Test Doc');
  });

  it('loads the most recent save', async () => {
    const doc1 = createEmptyDocument('First');
    const doc2 = createEmptyDocument('Second');
    await saveToDB(doc1);
    await saveToDB(doc2);
    const loaded = await loadLatestFromDB();
    expect(loaded!.name).toBe('Second');
  });

  it('prunes saves beyond the rolling limit', async () => {
    for (let i = 0; i < 8; i++) {
      await saveToDB(createEmptyDocument(`Doc ${i}`));
    }
    const loaded = await loadLatestFromDB();
    expect(loaded!.name).toBe('Doc 7');

    // Verify total count is capped at 5
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figme-persistence', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    expect(count).toBe(5);
  });

  it('returns null when DB is empty', async () => {
    const loaded = await loadLatestFromDB();
    expect(loaded).toBeNull();
  });

  it('clearDB removes all saves', async () => {
    await saveToDB(createEmptyDocument('To Clear'));
    await clearDB();
    const loaded = await loadLatestFromDB();
    expect(loaded).toBeNull();
  });
});

describe('localStorage persistence', () => {
  it('saves and loads from localStorage', () => {
    const doc = createEmptyDocument('LS Doc');
    saveToLocalStorage(doc);
    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('LS Doc');
  });

  it('returns null when localStorage is empty', () => {
    const loaded = loadFromLocalStorage();
    expect(loaded).toBeNull();
  });
});

describe('loadPersistedDocument', () => {
  it('prefers IndexedDB over localStorage', async () => {
    const idbDoc = createEmptyDocument('From IDB');
    const lsDoc = createEmptyDocument('From LS');
    await saveToDB(idbDoc);
    saveToLocalStorage(lsDoc);

    const loaded = await loadPersistedDocument();
    expect(loaded!.name).toBe('From IDB');
  });

  it('falls back to localStorage when IndexedDB is empty', async () => {
    const lsDoc = createEmptyDocument('Fallback');
    saveToLocalStorage(lsDoc);

    const loaded = await loadPersistedDocument();
    expect(loaded!.name).toBe('Fallback');
  });

  it('returns null when both are empty', async () => {
    const loaded = await loadPersistedDocument();
    expect(loaded).toBeNull();
  });
});
