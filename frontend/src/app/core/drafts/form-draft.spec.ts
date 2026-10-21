import { BrowserStorageService } from '../storage/browser-storage.service';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DRAFT_TTL, DraftStore } from './draft-store.service';
import { FormDraft } from './form-draft';

describe('FormDraft decisions', () => {
  let store: DraftStore;
  const open = (version = 1) =>
    new FormDraft(store, 'create:new', version, (value) => typeof value === 'string');
  beforeEach(() => {
    sessionStorage.clear();
    store = TestBed.inject(DraftStore);
    store.confirmIdentity({ userId: 'A', workspaceId: 'W' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });
  it('does not overwrite a pending candidate and rejects a prompt that expires while open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
    open().capture('private');
    const form = open();
    form.capture('initial');
    expect(store.find(store.lease(), 'create:new')?.value).toBe('private');
    vi.setSystemTime(Date.now() + DRAFT_TTL);
    expect(form.restore()).toBeNull();
    expect(form.invalid()).toBe(true);
  });
  it('cannot acknowledge a request while in flight, and does not extend expiry when rejecting it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
    const form = open();
    form.begin('value');
    const expiry = store.find(store.lease(), 'create:new')?.expiresAt;
    form.verifiedAbsent();
    expect(form.uncertain()).toBe(true);
    vi.setSystemTime(Date.now() + 1000);
    form.rejected(new HttpErrorResponse({ status: 409 }));
    expect(form.uncertain()).toBe(false);
    expect(store.find(store.lease(), 'create:new')?.expiresAt).toBe(expiry);
  });
  it('asks on explicit navigation, skips expiry/logout, and never writes after a purge', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const form = open();
    form.capture('value');
    expect(form.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    store.suspend();
    expect(form.canLeave()).toBe(true);
    store.purge();
    store.confirmIdentity({ userId: 'A', workspaceId: 'W' });
    form.capture('late');
    expect(open().candidate()).toBeNull();
  });
  it('blocks a mutation when neither its uncertain marker nor removal of the old snapshot is possible', () => {
    const form = open();
    form.capture('unsent snapshot');
    const storage = TestBed.inject(BrowserStorageService);
    vi.spyOn(storage, 'write').mockReturnValue(false);
    const remove = vi.spyOn(storage, 'remove').mockReturnValue(false);
    expect(form.begin('updated')).toBe(false);
    expect(form.submissionBlocked()).toBe(true);
    expect(form.pending()).toBe(false);
    remove.mockRestore();
    expect(form.begin('updated')).toBe(true);
    expect(sessionStorage.getItem('barbook.drafts.v1')).toBeNull();
  });
});
