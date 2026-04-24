import 'fake-indexeddb/auto';
import {
  saveToDB,
  loadLatestFromDB,
  clearDB,
  saveToLocalStorage,
  loadFromLocalStorage,
  loadPersistedDocument,
  loadLegacyDocument,
  clearTabFromDB,
  cleanupLegacyDB,
  enforceGlobalCap,
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

const TAB_A = 'tab-a';
const TAB_B = 'tab-b';

beforeEach(async () => {
  await clearDB();
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

describe('IndexedDB persistence', () => {
  it('saves and loads a document for a tab', async () => {
    const doc = createEmptyDocument('Test Doc');
    await saveToDB(doc, TAB_A);
    const loaded = await loadLatestFromDB(TAB_A);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Test Doc');
  });

  it('loads the most recent save for a tab', async () => {
    const doc1 = createEmptyDocument('First');
    const doc2 = createEmptyDocument('Second');
    await saveToDB(doc1, TAB_A);
    await saveToDB(doc2, TAB_A);
    const loaded = await loadLatestFromDB(TAB_A);
    expect(loaded!.name).toBe('Second');
  });

  it('prunes saves beyond the rolling limit per tab', async () => {
    for (let i = 0; i < 8; i++) {
      await saveToDB(createEmptyDocument(`Doc ${i}`), TAB_A);
    }
    const loaded = await loadLatestFromDB(TAB_A);
    expect(loaded!.name).toBe('Doc 7');

    // Verify total count for tab-A is capped at 5
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figmii-persistence', 2);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const index = tx.objectStore('saves').index('tabId_timestamp');
      const range = IDBKeyRange.bound([TAB_A, 0], [TAB_A, Infinity]);
      const req = index.count(range);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    expect(count).toBe(5);
  });

  it('returns null when DB is empty', async () => {
    const loaded = await loadLatestFromDB(TAB_A);
    expect(loaded).toBeNull();
  });

  it('clearDB removes all saves', async () => {
    await saveToDB(createEmptyDocument('To Clear'), TAB_A);
    await clearDB();
    const loaded = await loadLatestFromDB(TAB_A);
    expect(loaded).toBeNull();
  });
});

describe('Tab isolation', () => {
  it('saves from one tab are not visible to another', async () => {
    await saveToDB(createEmptyDocument('Tab A Doc'), TAB_A);
    const loaded = await loadLatestFromDB(TAB_B);
    expect(loaded).toBeNull();
  });

  it('each tab loads its own document', async () => {
    await saveToDB(createEmptyDocument('Doc A'), TAB_A);
    await saveToDB(createEmptyDocument('Doc B'), TAB_B);
    const loadedA = await loadLatestFromDB(TAB_A);
    const loadedB = await loadLatestFromDB(TAB_B);
    expect(loadedA!.name).toBe('Doc A');
    expect(loadedB!.name).toBe('Doc B');
  });

  it('pruning for one tab does not affect another', async () => {
    for (let i = 0; i < 8; i++) {
      await saveToDB(createEmptyDocument(`A-${i}`), TAB_A);
    }
    for (let i = 0; i < 3; i++) {
      await saveToDB(createEmptyDocument(`B-${i}`), TAB_B);
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figmii-persistence', 2);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const countForTab = async (tabId: string): Promise<number> => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction('saves', 'readonly');
        const index = tx.objectStore('saves').index('tabId_timestamp');
        const range = IDBKeyRange.bound([tabId, 0], [tabId, Infinity]);
        const req = index.count(range);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    };

    expect(await countForTab(TAB_A)).toBe(5);
    expect(await countForTab(TAB_B)).toBe(3);
    db.close();
  });
});

describe('clearTabFromDB', () => {
  it('removes only the specified tab records', async () => {
    await saveToDB(createEmptyDocument('A'), TAB_A);
    await saveToDB(createEmptyDocument('B'), TAB_B);
    await clearTabFromDB(TAB_A);
    expect(await loadLatestFromDB(TAB_A)).toBeNull();
    expect(await loadLatestFromDB(TAB_B)).not.toBeNull();
  });
});

describe('localStorage persistence', () => {
  it('saves and loads from localStorage per tab', () => {
    const doc = createEmptyDocument('LS Doc');
    saveToLocalStorage(doc, TAB_A);
    const loaded = loadFromLocalStorage(TAB_A);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('LS Doc');
  });

  it('tab-scoped localStorage keys are isolated', () => {
    saveToLocalStorage(createEmptyDocument('A'), TAB_A);
    saveToLocalStorage(createEmptyDocument('B'), TAB_B);
    expect(loadFromLocalStorage(TAB_A)!.name).toBe('A');
    expect(loadFromLocalStorage(TAB_B)!.name).toBe('B');
  });

  it('returns null when localStorage is empty for tab', () => {
    const loaded = loadFromLocalStorage(TAB_A);
    expect(loaded).toBeNull();
  });
});

describe('loadPersistedDocument', () => {
  it('prefers IndexedDB over localStorage', async () => {
    const idbDoc = createEmptyDocument('From IDB');
    const lsDoc = createEmptyDocument('From LS');
    await saveToDB(idbDoc, TAB_A);
    saveToLocalStorage(lsDoc, TAB_A);

    const loaded = await loadPersistedDocument(TAB_A);
    expect(loaded!.name).toBe('From IDB');
  });

  it('falls back to localStorage when IndexedDB is empty', async () => {
    const lsDoc = createEmptyDocument('Fallback');
    saveToLocalStorage(lsDoc, TAB_A);

    const loaded = await loadPersistedDocument(TAB_A);
    expect(loaded!.name).toBe('Fallback');
  });

  it('returns null when both are empty', async () => {
    const loaded = await loadPersistedDocument(TAB_A);
    expect(loaded).toBeNull();
  });
});

describe('Legacy migration', () => {
  it('loadLegacyDocument reads from legacy localStorage key', async () => {
    const doc = createEmptyDocument('Legacy');
    store['figmii_autosave'] = JSON.stringify(doc);
    const loaded = await loadLegacyDocument();
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Legacy');
  });

  it('loadLegacyDocument reads most recent from IndexedDB regardless of tabId', async () => {
    await saveToDB(createEmptyDocument('Tab Doc'), TAB_A);
    const loaded = await loadLegacyDocument();
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Tab Doc');
  });

  it('cleanupLegacyDB removes records with no tabId', async () => {
    // Manually insert a v1-style record (no tabId)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figmii-persistence', 2);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').add({
        timestamp: Date.now(),
        document: createEmptyDocument('V1 Doc'),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();

    await cleanupLegacyDB();

    // All records with missing tabId should be gone
    const db2 = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figmii-persistence', 2);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db2.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db2.close();
    expect(count).toBe(0);
  });
});

describe('enforceGlobalCap', () => {
  it('removes oldest records when exceeding cap', async () => {
    for (let i = 0; i < 10; i++) {
      await saveToDB(createEmptyDocument(`Cap ${i}`), `tab-${i}`);
    }
    await enforceGlobalCap(5);

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('figmii-persistence', 2);
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
});
