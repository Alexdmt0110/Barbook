import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { WorkspaceContext } from './workspace-context';
const id = '10000000-0000-4000-8000-000000000002';
const auth = {
  user: { id: 'u', displayName: 'QA', email: 'qa@example.test' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
const shared = { id, name: 'Bar', role: 'MEMBER', accessVersion: 7 };
describe('Same-context access verification', () => {
  let http: HttpTestingController;
  let workspace: WorkspaceContext;
  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    workspace = TestBed.inject(WorkspaceContext);
    await lastValueFrom(workspace.confirmSession(auth));
    const opening = lastValueFrom(workspace.select(id, async () => true));
    http.expectOne(`/api/workspaces/${id}`).flush(shared);
    await opening;
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  it('keeps the active context mounted during verification and adopts only the authorized response', () => {
    const initial = workspace.current();
    const values = vi.fn();
    workspace.verifyCurrentAccess().subscribe(values);
    expect(workspace.current()).toBe(initial);
    expect(workspace.current()?.accessVersion).toBe(7);
    http.expectOne(`/api/workspaces/${id}`).flush({ ...shared, accessVersion: 8 });
    expect(workspace.current()?.accessVersion).toBe(8);
    expect(workspace.current()?.id).toBe(id);
    expect(values).toHaveBeenCalledOnce();
  });
  it('drops an old response after session suspension without reactivating the Bar', () => {
    const error = vi.fn();
    workspace.verifyCurrentAccess().subscribe({ error });
    const pending = http.expectOne(`/api/workspaces/${id}`);
    workspace.suspend(true);
    pending.flush({ ...shared, accessVersion: 8 });
    expect(error).toHaveBeenCalledOnce();
    expect(workspace.current()).toBe(null);
  });
  it('refuses verification/adoption before or during a pending mutation', () => {
    const release = workspace.trackMutation();
    const firstError = vi.fn();
    workspace.verifyCurrentAccess().subscribe({ error: firstError });
    http.expectNone(`/api/workspaces/${id}`);
    expect(firstError).toHaveBeenCalledOnce();
    release();
    const initial = workspace.current();
    const secondError = vi.fn();
    workspace.verifyCurrentAccess().subscribe({ error: secondError });
    const pending = http.expectOne(`/api/workspaces/${id}`);
    const releaseLate = workspace.trackMutation();
    pending.flush({ ...shared, accessVersion: 8 });
    expect(secondError).toHaveBeenCalledOnce();
    expect(workspace.current()).toBe(initial);
    releaseLate();
  });
  it('suspends and hides a revoked context, while a network failure keeps the form context with an explicit error', () => {
    const initial = workspace.current();
    workspace.verifyCurrentAccess().subscribe({ error: () => undefined });
    http.expectOne(`/api/workspaces/${id}`).error(new ProgressEvent('error'));
    expect(workspace.current()).toBe(initial);
    expect(workspace.error()).toContain('pas revérifiés');
    workspace.verifyCurrentAccess().subscribe({ error: () => undefined });
    http.expectOne(`/api/workspaces/${id}`).flush({}, { status: 404, statusText: 'Not found' });
    expect(workspace.current()).toBe(null);
    expect(workspace.error()).toContain('pas revérifiés');
  });
  it('asks a memory form before a workspace switch and permits switching after unregister', async () => {
    const current = workspace.current();
    const guard = vi.fn(() => false),
      remove = workspace.registerExitGuard(guard);
    expect(await lastValueFrom(workspace.select('other', async () => true))).toBe(false);
    expect(workspace.current()).toBe(current);
    http.expectNone('/api/workspaces/other');
    expect(guard).toHaveBeenCalledOnce();
    remove();
    const changing = lastValueFrom(workspace.select('other', async () => true));
    http.expectOne('/api/workspaces/other').flush({ ...shared, id: 'other' });
    expect(await changing).toBe(true);
    expect(workspace.current()?.id).toBe('other');
  });
});
