import { deserializeDocument } from '@primitives/document-model/serialization.ts';
import type { FigMeDocument } from '@primitives/document-model/types.ts';

const DB_NAME = 'figme-persistence';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const MAX_SAVES = 5;
const LOCAL_STORAGE_KEY = 'figme_autosave';

interface SaveRecord {
  id?: number;
  timestamp: number;
  document: FigMeDocument;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToDB(doc: FigMeDocument): Promise<void> {
  const db = await openDb();
  try {
    const record: SaveRecord = { timestamp: Date.now(), document: doc };

    // Write new save
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Prune old saves beyond MAX_SAVES
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();
    await new Promise<void>((resolve, reject) => {
      countReq.onsuccess = () => {
        const total = countReq.result;
        if (total <= MAX_SAVES) {
          resolve();
          return;
        }
        const toDelete = total - MAX_SAVES;
        const cursor = store.openCursor();
        let deleted = 0;
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          } else {
            resolve();
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

export async function loadLatestFromDB(): Promise<FigMeDocument | null> {
  const db = await openDb();
  try {
    return await new Promise<FigMeDocument | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index('timestamp');
      const cursor = index.openCursor(null, 'prev');
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          resolve((c.value as SaveRecord).document);
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

// --- Loading helpers (no store dependency) ---

export function loadFromLocalStorage(): FigMeDocument | null {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return deserializeDocument(saved);
  } catch {
    // Invalid JSON or storage unavailable
  }
  return null;
}

export function saveToLocalStorage(doc: FigMeDocument): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Storage full or unavailable -- silently skip
  }
}

export async function loadPersistedDocument(): Promise<FigMeDocument | null> {
  // Try IndexedDB first (primary, larger capacity)
  try {
    const doc = await loadLatestFromDB();
    if (doc) return doc;
  } catch {
    // IndexedDB unavailable — fall through
  }
  // Fall back to localStorage
  return loadFromLocalStorage();
}
