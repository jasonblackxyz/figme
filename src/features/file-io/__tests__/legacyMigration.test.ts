import 'fake-indexeddb/auto';
import { migrateFigmeToFigmii } from '../legacyMigration.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

const OLD_DB = 'fig' + 'me-persistence';
const NEW_DB = 'figmii-persistence';

function oldKey(suffix: string): string {
  return 'fig' + 'me_' + suffix;
}
function oldTabIdKey(): string {
  return 'fig' + 'me_tab_id';
}

const localStore: Record<string, string> = {};
const localStorageMock = {
  get length() { return Object.keys(localStore).length; },
  key: (i: number) => Object.keys(localStore)[i] ?? null,
  getItem: (key: string) => localStore[key] ?? null,
  setItem: (key: string, value: string) => { localStore[key] = value; },
  removeItem: (key: string) => { delete localStore[key]; },
  clear: () => { for (const k of Object.keys(localStore)) delete localStore[k]; },
};
vi.stubGlobal('localStorage', localStorageMock);

const sessionStore: Record<string, string> = {};
const sessionStorageMock = {
  get length() { return Object.keys(sessionStore).length; },
  key: (i: number) => Object.keys(sessionStore)[i] ?? null,
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, value: string) => { sessionStore[key] = value; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { for (const k of Object.keys(sessionStore)) delete sessionStore[k]; },
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

const STORE = 'saves';

async function deleteDb(name: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

async function openDbTest(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tabId_timestamp', ['tabId', 'timestamp'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function seedOldDb(records: Array<{ tabId: string; docName: string }>): Promise<void> {
  const db = await openDbTest(OLD_DB);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const r of records) {
        store.add({
          timestamp: Date.now(),
          tabId: r.tabId,
          document: createEmptyDocument(r.docName),
        });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function countRecords(dbName: string): Promise<number> {
  if (!(await dbExists(dbName))) return 0;
  const db = await openDbTest(dbName);
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function dbExists(name: string): Promise<boolean> {
  const dbs = await indexedDB.databases();
  return dbs.some((db) => db.name === name);
}

beforeEach(async () => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  await deleteDb(OLD_DB);
  await deleteDb(NEW_DB);
});

describe('migrateFigmeToFigmii — localStorage', () => {
  it('renames legacy keys to figmii_* equivalents', async () => {
    localStorage.setItem(oldKey('autosave'), 'legacy-value');
    localStorage.setItem(oldKey('autosave_tab-1'), 'doc-1');
    localStorage.setItem(oldKey('autosave_tab-2'), 'doc-2');
    localStorage.setItem(oldKey('heartbeat_tab-1'), '123');
    localStorage.setItem(oldKey('v2_migrated'), 'true');
    localStorage.setItem('unrelated', 'keep');

    await migrateFigmeToFigmii();

    expect(localStorage.getItem('figmii_autosave')).toBe('legacy-value');
    expect(localStorage.getItem('figmii_autosave_tab-1')).toBe('doc-1');
    expect(localStorage.getItem('figmii_autosave_tab-2')).toBe('doc-2');
    expect(localStorage.getItem('figmii_heartbeat_tab-1')).toBe('123');
    expect(localStorage.getItem('figmii_v2_migrated')).toBe('true');
    expect(localStorage.getItem('unrelated')).toBe('keep');

    expect(localStorage.getItem(oldKey('autosave'))).toBeNull();
    expect(localStorage.getItem(oldKey('autosave_tab-1'))).toBeNull();
    expect(localStorage.getItem(oldKey('heartbeat_tab-1'))).toBeNull();
  });

  it('does not overwrite an existing new key if both are present', async () => {
    localStorage.setItem(oldKey('autosave_tab-1'), 'old');
    localStorage.setItem('figmii_autosave_tab-1', 'new');

    await migrateFigmeToFigmii();

    expect(localStorage.getItem('figmii_autosave_tab-1')).toBe('new');
    expect(localStorage.getItem(oldKey('autosave_tab-1'))).toBeNull();
  });

  it('sets the migration sentinel', async () => {
    await migrateFigmeToFigmii();
    expect(localStorage.getItem('figmii_migration_v1')).toBe('true');
  });

  it('is a no-op when sentinel is already set', async () => {
    localStorage.setItem('figmii_migration_v1', 'true');
    localStorage.setItem(oldKey('autosave_tab-1'), 'should-stay');

    await migrateFigmeToFigmii();

    expect(localStorage.getItem(oldKey('autosave_tab-1'))).toBe('should-stay');
    expect(localStorage.getItem('figmii_autosave_tab-1')).toBeNull();
  });
});

describe('migrateFigmeToFigmii — sessionStorage', () => {
  it('renames the legacy tab-id key to figmii_tab_id', async () => {
    sessionStorage.setItem(oldTabIdKey(), 'tab_abc');
    await migrateFigmeToFigmii();
    expect(sessionStorage.getItem('figmii_tab_id')).toBe('tab_abc');
    expect(sessionStorage.getItem(oldTabIdKey())).toBeNull();
  });
});

describe('migrateFigmeToFigmii — IndexedDB', () => {
  it('copies records from the legacy DB to the new DB and deletes the old one', async () => {
    await seedOldDb([
      { tabId: 'tab-1', docName: 'Doc One' },
      { tabId: 'tab-2', docName: 'Doc Two' },
      { tabId: 'tab-1', docName: 'Doc Three' },
    ]);

    await migrateFigmeToFigmii();

    expect(await countRecords(NEW_DB)).toBe(3);
    expect(await dbExists(OLD_DB)).toBe(false);
  });

  it('does nothing when the legacy DB does not exist', async () => {
    await migrateFigmeToFigmii();
    expect(await dbExists(NEW_DB)).toBe(false);
    expect(await dbExists(OLD_DB)).toBe(false);
  });
});
