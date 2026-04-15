import { clearTabFromDB, cleanupLegacyDB, enforceGlobalCap } from './persistenceDb.ts';

const HEARTBEAT_PREFIX = 'figme_heartbeat_';
const AUTOSAVE_PREFIX = 'figme_autosave_';
const LEGACY_LOCAL_STORAGE_KEY = 'figme_autosave';
const LEGACY_MIGRATED_KEY = 'figme_v2_migrated';
const STALE_THRESHOLD_MS = 60_000; // 60 seconds

export function writeHeartbeat(tabId: string): void {
  try {
    localStorage.setItem(`${HEARTBEAT_PREFIX}${tabId}`, String(Date.now()));
  } catch {
    // Storage unavailable
  }
}

export async function cleanupStaleTabs(): Promise<void> {
  const now = Date.now();
  const staleTabIds: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(HEARTBEAT_PREFIX)) {
      const tabId = key.slice(HEARTBEAT_PREFIX.length);
      const ts = Number(localStorage.getItem(key));
      if (now - ts > STALE_THRESHOLD_MS) {
        staleTabIds.push(tabId);
      }
    }
  }

  for (const tabId of staleTabIds) {
    localStorage.removeItem(`${HEARTBEAT_PREFIX}${tabId}`);
    localStorage.removeItem(`${AUTOSAVE_PREFIX}${tabId}`);
    await clearTabFromDB(tabId).catch(() => {});
  }

  // Global safety cap on IndexedDB records
  await enforceGlobalCap().catch(() => {});
}

export function isLegacyMigrated(): boolean {
  return localStorage.getItem(LEGACY_MIGRATED_KEY) === 'true';
}

export async function cleanupLegacySaves(): Promise<void> {
  localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  await cleanupLegacyDB().catch(() => {});
  localStorage.setItem(LEGACY_MIGRATED_KEY, 'true');
}
