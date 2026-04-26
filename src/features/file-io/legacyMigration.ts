/**
 * One-time migration from the pre-rename "figme" storage namespace to "figmii".
 * Runs at app startup. Safe to call on every load — a sentinel prevents re-runs.
 *
 * Legacy namespaces covered (keys/DB names built at runtime to prevent future
 * find-and-replace passes from accidentally rewriting both sides of the map):
 *   - localStorage:   <legacy>_autosave, <legacy>_autosave_<tabId>,
 *                     <legacy>_heartbeat_<tabId>, <legacy>_v2_migrated
 *   - sessionStorage: <legacy>_tab_id
 *   - IndexedDB:      <legacy>-persistence (full copy of its 'saves' store)
 */

const LEGACY_PREFIX = 'fig' + 'me';
const NEW_PREFIX = 'figmii';

const SENTINEL_KEY = `${NEW_PREFIX}_migration_v1`;
const OLD_DB_NAME = `${LEGACY_PREFIX}-persistence`;
const NEW_DB_NAME = `${NEW_PREFIX}-persistence`;
const STORE_NAME = 'saves';
const DB_VERSION = 2;

interface LegacySaveRecord {
  id?: number;
  timestamp: number;
  tabId: string;
  document: unknown;
}

export async function migrateFigmeToFigmii(): Promise<void> {
  try {
    if (localStorage.getItem(SENTINEL_KEY) === 'true') return;
  } catch {
    return;
  }

  try {
    migrateLocalStorage();
    migrateSessionStorage();
    await migrateIndexedDB();
    localStorage.setItem(SENTINEL_KEY, 'true');
  } catch (err) {
    console.warn('[FIGMII] Legacy storage migration failed:', err);
  }
}

function renamedKey(oldKey: string): string | null {
  const oldAutosave = `${LEGACY_PREFIX}_autosave`;
  const oldV2 = `${LEGACY_PREFIX}_v2_migrated`;
  const oldAutosavePrefix = `${LEGACY_PREFIX}_autosave_`;
  const oldHeartbeatPrefix = `${LEGACY_PREFIX}_heartbeat_`;

  if (oldKey === oldAutosave) return `${NEW_PREFIX}_autosave`;
  if (oldKey === oldV2) return `${NEW_PREFIX}_v2_migrated`;
  if (oldKey.startsWith(oldAutosavePrefix)) {
    return `${NEW_PREFIX}_autosave_${oldKey.slice(oldAutosavePrefix.length)}`;
  }
  if (oldKey.startsWith(oldHeartbeatPrefix)) {
    return `${NEW_PREFIX}_heartbeat_${oldKey.slice(oldHeartbeatPrefix.length)}`;
  }
  return null;
}

function migrateLocalStorage(): void {
  const renames: Array<[string, string]> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const newKey = renamedKey(key);
    if (newKey) renames.push([key, newKey]);
  }
  for (const [oldKey, newKey] of renames) {
    const value = localStorage.getItem(oldKey);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
    }
    localStorage.removeItem(oldKey);
  }
}

function migrateSessionStorage(): void {
  try {
    const oldTabIdKey = `${LEGACY_PREFIX}_tab_id`;
    const newTabIdKey = `${NEW_PREFIX}_tab_id`;
    const tabId = sessionStorage.getItem(oldTabIdKey);
    if (tabId !== null && sessionStorage.getItem(newTabIdKey) === null) {
      sessionStorage.setItem(newTabIdKey, tabId);
    }
    sessionStorage.removeItem(oldTabIdKey);
  } catch {
    // sessionStorage unavailable
  }
}

async function migrateIndexedDB(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (!(await databaseExists(OLD_DB_NAME))) return;

  const oldDb = await openDb(OLD_DB_NAME);
  let records: LegacySaveRecord[] = [];
  try {
    records = await new Promise<LegacySaveRecord[]>((resolve, reject) => {
      const tx = oldDb.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as LegacySaveRecord[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    oldDb.close();
  }

  if (records.length > 0) {
    const newDb = await openDb(NEW_DB_NAME);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = newDb.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const rec of records) {
          const { id: _id, ...rest } = rec;
          store.add(rest);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      newDb.close();
    }
  }

  await new Promise<void>((resolve) => {
    const del = indexedDB.deleteDatabase(OLD_DB_NAME);
    del.onsuccess = () => resolve();
    del.onerror = () => resolve();
    del.onblocked = () => resolve();
  });
}

async function databaseExists(name: string): Promise<boolean> {
  if (typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases();
      return dbs.some((db) => db.name === name);
    } catch {
      // fall through to probe
    }
  }
  return new Promise((resolve) => {
    const req = indexedDB.open(name);
    req.onsuccess = () => {
      const db = req.result;
      const hasStore = db.objectStoreNames.contains(STORE_NAME);
      db.close();
      resolve(hasStore);
    };
    req.onerror = () => resolve(false);
  });
}

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tabId_timestamp', ['tabId', 'timestamp'], {
          unique: false,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
