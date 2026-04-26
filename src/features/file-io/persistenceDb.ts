import { deserializeDocument, migrateDocument, serializeDocument } from '@primitives/document-model/serialization.ts';
import type { FIGMIIDocument } from '@primitives/document-model/types.ts';

const DB_NAME = 'figmii-persistence';
const DB_VERSION = 2;
const STORE_NAME = 'saves';
const MAX_SAVES = 5;
export const LEGACY_LOCAL_STORAGE_KEY = 'figmii_autosave';

function localStorageKey(tabId: string): string {
  return `figmii_autosave_${tabId}`;
}

interface SaveRecord {
  id?: number;
  timestamp: number;
  tabId: string;
  document: FIGMIIDocument;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Fresh install: create store with both indexes
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('tabId_timestamp', ['tabId', 'timestamp'], {
          unique: false,
        });
      } else if (oldVersion < 2) {
        // Upgrade from v1: add compound index for per-tab queries
        const store = request.transaction!.objectStore(STORE_NAME);
        store.createIndex('tabId_timestamp', ['tabId', 'timestamp'], {
          unique: false,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToDB(
  doc: FIGMIIDocument,
  tabId: string,
): Promise<void> {
  const db = await openDb();
  try {
    const record: SaveRecord = {
      timestamp: Date.now(),
      tabId,
      document: migrateDocument(doc),
    };

    // Write new save
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Prune old saves for this tab beyond MAX_SAVES
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('tabId_timestamp');
    const range = IDBKeyRange.bound([tabId, 0], [tabId, Infinity]);
    const countReq = index.count(range);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total <= MAX_SAVES) {
          return;
        }
        const toDelete = total - MAX_SAVES;
        const cursor = index.openCursor(range);
        let deleted = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  } finally {
    db.close();
  }
}

export async function loadLatestFromDB(
  tabId: string,
): Promise<FIGMIIDocument | null> {
  const db = await openDb();
  try {
    return await new Promise<FIGMIIDocument | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('tabId_timestamp');
      const range = IDBKeyRange.bound([tabId, 0], [tabId, Infinity]);
      const cursor = index.openCursor(range, 'prev');
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          resolve(migrateDocument((c.value as SaveRecord).document));
        } else {
          resolve(null);
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });
  } finally {
    db.close();
  }
}

export async function clearDB(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearTabFromDB(tabId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.objectStore(STORE_NAME).index('tabId_timestamp');
      const range = IDBKeyRange.bound([tabId, 0], [tabId, Infinity]);
      const cursor = index.openCursor(range);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          c.delete();
          c.continue();
        }
      };
      cursor.onerror = () => reject(cursor.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// --- localStorage helpers ---

export function loadFromLocalStorage(tabId: string): FIGMIIDocument | null {
  try {
    const saved = localStorage.getItem(localStorageKey(tabId));
    if (saved) return deserializeDocument(saved);
  } catch {
    // Invalid JSON or storage unavailable
  }
  return null;
}

export function saveToLocalStorage(doc: FIGMIIDocument, tabId: string): void {
  try {
    localStorage.setItem(localStorageKey(tabId), serializeDocument(doc));
  } catch {
    // Storage full or unavailable -- silently skip
  }
}

// --- Unified loaders ---

export async function loadPersistedDocument(
  tabId: string,
): Promise<FIGMIIDocument | null> {
  // Try IndexedDB first (primary, larger capacity)
  try {
    const doc = await loadLatestFromDB(tabId);
    if (doc) return doc;
  } catch {
    // IndexedDB unavailable — fall through
  }
  // Fall back to localStorage
  return loadFromLocalStorage(tabId);
}

// --- Legacy v1 loaders (migration only) ---

export async function loadLegacyDocument(): Promise<FIGMIIDocument | null> {
  // Try IndexedDB: get most recent record regardless of tabId
  try {
    const db = await openDb();
    try {
      const doc = await new Promise<FIGMIIDocument | null>(
        (resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const index = tx.objectStore(STORE_NAME).index('timestamp');
          const cursor = index.openCursor(null, 'prev');
          cursor.onsuccess = () => {
            const c = cursor.result;
            if (c) {
              resolve(migrateDocument((c.value as SaveRecord).document));
            } else {
              resolve(null);
            }
          };
          cursor.onerror = () => reject(cursor.error);
        },
      );
      if (doc) return doc;
    } finally {
      db.close();
    }
  } catch {
    // IndexedDB unavailable
  }

  // Fall back to legacy localStorage key
  try {
    const saved = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (saved) return deserializeDocument(saved);
  } catch {
    // Invalid JSON or storage unavailable
  }
  return null;
}

export async function cleanupLegacyDB(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          const record = c.value as SaveRecord;
          if (record.tabId === undefined || record.tabId === null) {
            c.delete();
          }
          c.continue();
        }
      };
      cursor.onerror = () => reject(cursor.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function enforceGlobalCap(maxRecords = 50): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total <= maxRecords) return;
        const toDelete = total - maxRecords;
        const cursor = store.openCursor();
        let deleted = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  } finally {
    db.close();
  }
}
