import 'fake-indexeddb/auto';
import {
  writeHeartbeat,
  cleanupStaleTabs,
  cleanupLegacySaves,
  isLegacyMigrated,
} from '../staleCleanup.ts';
import { saveToDB, loadLatestFromDB, clearDB } from '../persistenceDb.ts';
import { createEmptyDocument } from '@primitives/document-model/operations.ts';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(async () => {
  await clearDB();
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

describe('writeHeartbeat', () => {
  it('writes a timestamp to localStorage', () => {
    writeHeartbeat('tab-1');
    const ts = Number(store['figmii_heartbeat_tab-1']);
    expect(ts).toBeGreaterThan(0);
    expect(Date.now() - ts).toBeLessThan(1000);
  });
});

describe('cleanupStaleTabs', () => {
  it('removes stale tab saves from localStorage and IndexedDB', async () => {
    const tabId = 'stale-tab';
    // Create a stale heartbeat (2 minutes ago)
    store[`figmii_heartbeat_${tabId}`] = String(Date.now() - 120_000);
    store[`figmii_autosave_${tabId}`] = JSON.stringify(createEmptyDocument('Stale'));
    await saveToDB(createEmptyDocument('Stale DB'), tabId);

    await cleanupStaleTabs();

    expect(store[`figmii_heartbeat_${tabId}`]).toBeUndefined();
    expect(store[`figmii_autosave_${tabId}`]).toBeUndefined();
    expect(await loadLatestFromDB(tabId)).toBeNull();
  });

  it('preserves fresh tab saves', async () => {
    const tabId = 'fresh-tab';
    writeHeartbeat(tabId);
    store[`figmii_autosave_${tabId}`] = JSON.stringify(createEmptyDocument('Fresh'));
    await saveToDB(createEmptyDocument('Fresh DB'), tabId);

    await cleanupStaleTabs();

    expect(store[`figmii_heartbeat_${tabId}`]).toBeDefined();
    expect(store[`figmii_autosave_${tabId}`]).toBeDefined();
    expect(await loadLatestFromDB(tabId)).not.toBeNull();
  });

  it('cleans stale tabs while preserving fresh ones', async () => {
    const staleId = 'stale';
    const freshId = 'fresh';

    store[`figmii_heartbeat_${staleId}`] = String(Date.now() - 120_000);
    store[`figmii_autosave_${staleId}`] = 'x';
    await saveToDB(createEmptyDocument('Stale'), staleId);

    writeHeartbeat(freshId);
    await saveToDB(createEmptyDocument('Fresh'), freshId);

    await cleanupStaleTabs();

    expect(await loadLatestFromDB(staleId)).toBeNull();
    expect(await loadLatestFromDB(freshId)).not.toBeNull();
  });
});

describe('Legacy migration helpers', () => {
  it('isLegacyMigrated returns false before migration', () => {
    expect(isLegacyMigrated()).toBe(false);
  });

  it('cleanupLegacySaves removes legacy key and sets migrated flag', async () => {
    store['figmii_autosave'] = JSON.stringify(createEmptyDocument('Legacy'));

    await cleanupLegacySaves();

    expect(store['figmii_autosave']).toBeUndefined();
    expect(isLegacyMigrated()).toBe(true);
  });
});
