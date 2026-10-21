import { TestBed } from '@angular/core/testing';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { DRAFT_KEY, DRAFT_TTL, DraftStore } from './draft-store.service';

const a = { userId: 'A', workspaceId: 'WA' };
describe('DraftStore identity and lifetime', () => {
  let store: DraftStore;
  beforeEach(() => {
    sessionStorage.clear();
    store = TestBed.inject(DraftStore);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
  });
  const bind = () => {
    store.confirmIdentity(a);
    return store.lease();
  };
  it('has no authority before confirmed identity, isolates recipe keys and retains invalid input', () => {
    expect(store.lease()).toBeNull();
    expect(store.save(null, 'create:new', 1, {})).toBe(false);
    const lease = bind();
    store.save(lease, 'organization:recipe-a', 7, { amount: -2, unit: 'CL', name: '' });
    expect(store.find(lease, 'organization:recipe-b')).toBeNull();
    expect(store.find(lease, 'organization:recipe-a')?.value).toEqual({
      amount: -2,
      unit: 'CL',
      name: '',
    });
  });
  it('survives expiry and reload only for the same confirmed identity without extending TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
    const lease = bind();
    store.save(lease, 'create:new', 1, { unit: 'CL' });
    const saved = sessionStorage.getItem(DRAFT_KEY);
    store.suspend();
    expect(store.find(lease, 'create:new')).toBeNull();
    expect(store.save(lease, 'create:new', 1, { name: 'late' })).toBe(false);
    store.confirmIdentity(a);
    expect(store.find(store.lease(), 'create:new')?.value).toEqual({ unit: 'CL' });
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe(saved);
    vi.setSystemTime(Date.now() + DRAFT_TTL);
    expect(store.find(store.lease(), 'create:new')).toBeNull();
  });
  it.each([
    { userId: 'B', workspaceId: 'WA' },
    { userId: 'A', workspaceId: 'WB' },
  ])('purges on changed context %j and rejects captured writers', (owner) => {
    const lease = bind();
    store.save(lease, 'create:new', 1, 'private');
    store.confirmIdentity(owner);
    expect(store.find(store.lease(), 'create:new')).toBeNull();
    expect(store.save(lease, 'create:new', 1, 'resurrection')).toBe(false);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('imports a bounded envelope only after matching confirmation; rejects hostile schema, dates and sizes', () => {
    const lease = bind();
    store.save(lease, 'create:new', 1, 'private');
    const raw = sessionStorage.getItem(DRAFT_KEY)!;
    for (const transform of [
      (v: { schema: number; owner: typeof a; entries: Record<string, unknown>[] }) => ({
        ...v,
        schema: 2,
      }),
      (v: { schema: number; owner: typeof a; entries: Record<string, unknown>[] }) => ({
        ...v,
        owner: { ...a, userId: 'B' },
      }),
      (v: { schema: number; owner: typeof a; entries: Record<string, unknown>[] }) => ({
        ...v,
        entries: [...v.entries, ...v.entries],
      }),
      (v: { schema: number; owner: typeof a; entries: Record<string, unknown>[] }) => ({
        ...v,
        entries: [{ ...v.entries[0], savedAt: Date.now() + 1000 }],
      }),
    ]) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(transform(JSON.parse(raw))));
      TestBed.resetTestingModule();
      store = TestBed.inject(DraftStore);
      store.confirmIdentity(a);
      expect(store.find(store.lease(), 'create:new')).toBeNull();
    }
    for (const malformed of ['{', 'x'.repeat(500001)]) {
      sessionStorage.setItem(DRAFT_KEY, malformed);
      TestBed.resetTestingModule();
      store = TestBed.inject(DraftStore);
      store.confirmIdentity(a);
      expect(store.find(store.lease(), 'create:new')).toBeNull();
    }
    sessionStorage.setItem(DRAFT_KEY, raw);
    TestBed.resetTestingModule();
    store = TestBed.inject(DraftStore);
    expect(store.find(null, 'create:new')).toBeNull();
    store.confirmIdentity(a);
    expect(store.find(store.lease(), 'create:new')?.value).toBe('private');
  });
  it('keeps memory on quota failure and forbids import until a failed purge can be retried', () => {
    const storage = TestBed.inject(BrowserStorageService);
    const lease = bind();
    store.save(lease, 'create:new', 1, 'private');
    const write = vi.spyOn(storage, 'write').mockReturnValue(false);
    const remove = vi.spyOn(storage, 'remove').mockReturnValue(false);
    expect(store.save(lease, 'create:new', 1, 'memory')).toBe(false);
    expect(store.memoryOnly()).toBe(true);
    expect(store.find(lease, 'create:new')?.value).toBe('memory');
    store.purge();
    expect(store.purgeFailed()).toBe(true);
    store.confirmIdentity(a);
    expect(store.find(store.lease(), 'create:new')).toBeNull();
    expect(store.save(lease, 'create:new', 1, 'late')).toBe(false);
    write.mockRestore();
    remove.mockRestore();
    store.confirmIdentity(a);
    expect(store.purgeFailed()).toBe(false);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('overwrites with an empty tombstone if remove alone fails, without clearing unrelated storage', () => {
    const lease = bind();
    store.save(lease, 'create:new', 1, {});
    sessionStorage.setItem('theme-fixture', 'dark');
    vi.spyOn(TestBed.inject(BrowserStorageService), 'remove').mockReturnValue(false);
    store.purge();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe('');
    expect(sessionStorage.getItem('theme-fixture')).toBe('dark');
  });
  it('persists an uncertain outcome before a request and removes only its own successful entry', () => {
    const lease = bind();
    store.save(lease, 'create:new', 1, { name: 'new' }, true);
    store.save(lease, 'organization:other', 2, {});
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY)!);
    expect(raw.entries[0].uncertain).toBe(true);
    store.remove(lease, 'organization:other');
    expect(store.find(lease, 'create:new')?.uncertain).toBe(true);
  });
});
