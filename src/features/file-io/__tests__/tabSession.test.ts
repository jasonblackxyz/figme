import { getTabId } from '../tabSession.ts';

const store: Record<string, string> = {};
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
});

beforeEach(() => {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
});

describe('getTabId', () => {
  it('generates a new ID when sessionStorage is empty', () => {
    const id = getTabId();
    expect(id).toMatch(/^tab_\d+_/);
  });

  it('returns the same ID on repeated calls', () => {
    const first = getTabId();
    const second = getTabId();
    expect(first).toBe(second);
  });

  it('stores the ID in sessionStorage', () => {
    const id = getTabId();
    expect(store['figme_tab_id']).toBe(id);
  });

  it('uses an existing ID from sessionStorage', () => {
    store['figme_tab_id'] = 'existing-tab-id';
    expect(getTabId()).toBe('existing-tab-id');
  });
});
