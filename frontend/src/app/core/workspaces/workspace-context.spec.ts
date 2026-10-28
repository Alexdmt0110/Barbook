import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, firstValueFrom } from 'rxjs';
import { DraftStore, DRAFT_KEY } from '../drafts/draft-store.service';
import { FormDraft } from '../drafts/form-draft';
import { BrowserStorageService } from '../storage/browser-storage.service';
import { WorkspaceContext } from './workspace-context';

const barId = '00000000-0000-4000-8000-000000000001';
const auth = {
  user: { id: 'user-a', displayName: 'A', email: 'a@example.test' },
  workspaceId: 'personal-a',
  csrfToken: 'csrf',
};
const shared = { id: barId, name: 'Bar', role: 'MEMBER', accessVersion: 7 };
describe('Confirmed business workspace and existing draft isolation', () => {
  let context: WorkspaceContext;
  let drafts: DraftStore;
  let http: HttpTestingController;
  const navigate = () => Promise.resolve(true);
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    context = TestBed.inject(WorkspaceContext);
    drafts = TestBed.inject(DraftStore);
    http = TestBed.inject(HttpTestingController);
    context.confirmSession(auth).subscribe();
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  async function enterBar() {
    const selected = firstValueFrom(context.select(barId, navigate));
    http.expectOne(`/api/workspaces/${barId}`).flush(shared);
    expect(await selected).toBe(true);
  }
  it('confirms Personnel from /me only, with no shared route or persisted preference', () => {
    expect(context.current()).toMatchObject({
      id: auth.workspaceId,
      kind: 'PERSONAL',
      userId: auth.user.id,
    });
    expect(drafts.lease()?.owner.workspaceId).toBe(auth.workspaceId);
    expect(sessionStorage.length).toBe(0);
  });
  it('confirms a Bar before issuing its draft lease and captures its access version', async () => {
    const selected = firstValueFrom(context.select(barId, navigate));
    expect(context.current()?.kind).toBe('PERSONAL');
    expect(context.transitioning()).toBe(true);
    http.expectOne(`/api/workspaces/${barId}`).flush(shared);
    await selected;
    expect(context.current()).toMatchObject({ id: barId, kind: 'SHARED', accessVersion: 7 });
    expect(drafts.lease()?.owner).toEqual({ userId: auth.user.id, workspaceId: barId });
    const api = TestBed.inject(HttpClient);
    context
      .request(
        'cocktails',
        true,
        (url, accessVersion) => api.post(url, { expectedAccessVersion: accessVersion }),
        7,
      )
      .subscribe();
    const write = http.expectOne(`/api/workspaces/${barId}/cocktails`);
    expect(write.request.body).toEqual({ expectedAccessVersion: 7 });
    write.flush({ id: 'created' });
  });
  it('confirms removal of retained drafts honestly, and preserves them on cancellation', async () => {
    drafts.save(drafts.lease(), 'closed-form', 2, { notes: 'private' });
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(await firstValueFrom(context.select(barId, navigate))).toBe(false);
    expect(confirmation.mock.calls[0][0]).toContain('supprimera');
    expect(confirmation.mock.calls[0][0]).toContain('formulaires fermés');
    expect(drafts.find(drafts.lease(), 'closed-form')?.value).toEqual({ notes: 'private' });
    confirmation.mockReturnValue(true);
    await enterBar();
    expect(drafts.find(drafts.lease(), 'closed-form')).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('does not erase a draft or change workspace on failed membership confirmation', async () => {
    drafts.save(drafts.lease(), 'edit', 2, { notes: 'kept' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const selection = firstValueFrom(context.select(barId, navigate));
    http.expectOne(`/api/workspaces/${barId}`).flush({}, { status: 404, statusText: 'Missing' });
    await expect(selection).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(context.current()?.id).toBe(auth.workspaceId);
    expect(drafts.find(drafts.lease(), 'edit')?.value).toEqual({ notes: 'kept' });
    expect(context.transitioning()).toBe(false);
  });
  it('retains an expired Bar draft, reconfirms membership before restoration and never adopts Personnel temporarily', async () => {
    await enterBar();
    const oldLease = drafts.lease();
    drafts.save(oldLease, 'edit:recipe', 3, { notes: 'bar' });
    const saved = sessionStorage.getItem(DRAFT_KEY);
    context.suspend();
    const confirm = firstValueFrom(context.confirmSession(auth));
    expect(context.current()).toBeNull();
    expect(drafts.lease()).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe(saved);
    http.expectOne(`/api/workspaces/${barId}`).flush(shared);
    await confirm;
    expect(drafts.valid(oldLease)).toBe(false);
    expect(drafts.find(drafts.lease(), 'edit:recipe')?.value).toEqual({ notes: 'bar' });
    expect(sessionStorage.getItem(DRAFT_KEY)).toBe(saved);
  });
  it('keeps revoked Bar drafts suspended and requires explicit Personnel selection to purge', async () => {
    await enterBar();
    drafts.save(drafts.lease(), 'edit', 3, { notes: 'bar' });
    context.suspend();
    const confirm = firstValueFrom(context.confirmSession(auth));
    http.expectOne(`/api/workspaces/${barId}`).flush({}, { status: 404, statusText: 'Missing' });
    await confirm;
    expect(context.current()).toBeNull();
    expect(drafts.lease()).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await firstValueFrom(context.select(auth.workspaceId, navigate));
    expect(context.current()?.kind).toBe('PERSONAL');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('rejects late reads after a switch and does not send an automatic replacement request', async () => {
    const late = new Subject<string>();
    const error = vi.fn();
    context.request('cocktails', false, () => late).subscribe({ error });
    await enterBar();
    late.next('old personal result');
    expect(error).toHaveBeenCalledOnce();
    http.expectNone('/api/cocktails');
  });
  it('blocks switching during HTTP commands or pending existing FormDraft mutations', async () => {
    const pending = new Subject<void>();
    context.request('cocktails', true, () => pending).subscribe();
    await expect(firstValueFrom(context.select(barId, navigate))).rejects.toThrow('Attends');
    pending.complete();
    const form = new FormDraft(drafts, 'edit', 1, () => true);
    expect(form.begin({ notes: 'pending' })).toBe(true);
    await expect(firstValueFrom(context.select(barId, navigate))).rejects.toThrow('Attends');
    form.rejected(new HttpErrorResponse({ status: 409 }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await enterBar();
  });
  it('rejects a selection response after logout and cannot reactivate its draft lease', async () => {
    const selection = firstValueFrom(context.select(barId, navigate));
    const response = http.expectOne(`/api/workspaces/${barId}`);
    context.suspend(true);
    drafts.purge();
    response.flush(shared);
    await expect(selection).rejects.toThrow('session a changé');
    expect(context.current()).toBeNull();
    expect(drafts.lease()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it('does not reuse another account’s Bar or retained drafts', async () => {
    await enterBar();
    drafts.save(drafts.lease(), 'edit', 1, { notes: 'A' });
    context.suspend();
    await firstValueFrom(
      context.confirmSession({
        ...auth,
        user: { ...auth.user, id: 'B' },
        workspaceId: 'personal-b',
      }),
    );
    expect(context.current()).toMatchObject({ userId: 'B', id: 'personal-b', kind: 'PERSONAL' });
    expect(sessionStorage.length).toBe(0);
    expect(drafts.find(drafts.lease(), 'edit')).toBeNull();
  });
  it('uses memory honestly if selection storage is denied', async () => {
    vi.spyOn(TestBed.inject(BrowserStorageService), 'write').mockReturnValue(false);
    await enterBar();
    expect(context.memoryOnly()).toBe(true);
    expect(context.current()?.id).toBe(barId);
    expect(sessionStorage.length).toBe(0);
  });
  it('requires the access version of the loaded intention and never infers a fresh version', async () => {
    await enterBar();
    const send = vi.fn();
    for (const version of [undefined, 0, 6]) {
      await expect(
        firstValueFrom(context.request('cocktails', true, send, version)),
      ).rejects.toMatchObject({ status: 409 });
    }
    expect(send).not.toHaveBeenCalled();
    expect(context.pendingCommands()).toBe(0);
  });
  it('invalidates old form leases when the confirmed membership version changes', async () => {
    await enterBar();
    const oldLease = drafts.lease();
    drafts.save(oldLease, 'edit', 1, { notes: 'old intention' });
    const resumed = firstValueFrom(context.confirmSession(auth));
    http.expectOne(`/api/workspaces/${barId}`).flush({ ...shared, accessVersion: 9 });
    await resumed;
    expect(drafts.valid(oldLease)).toBe(false);
    expect(drafts.find(drafts.lease(), 'edit')?.value).toEqual({ notes: 'old intention' });
    await expect(
      firstValueFrom(context.request('cocktails', true, () => new Subject(), 7)),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('masks the business context if navigation fails after a confirmed switch', async () => {
    const selected = firstValueFrom(context.select(barId, () => Promise.resolve(false)));
    http.expectOne(`/api/workspaces/${barId}`).flush(shared);
    await expect(selected).rejects.toThrow('affiché');
    expect(context.current()).toBeNull();
    expect(drafts.lease()).toBeNull();
  });
  it('does not claim that a successfully saved empty envelope still contains a draft', async () => {
    const lease = drafts.lease();
    drafts.save(lease, 'edit', 1, { notes: 'saved' });
    drafts.remove(lease, 'edit');
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await enterBar();
    expect(confirm).not.toHaveBeenCalled();
  });
});
