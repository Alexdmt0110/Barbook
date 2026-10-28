import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';
import { WorkspaceMembers } from './workspace-members';
const id = '00000000-0000-4000-8000-000000000001';
const auth = {
  user: { id: 'owner', email: 'owner@example.test', displayName: 'Owner' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
const member = {
  userId: 'member',
  role: 'MEMBER',
  user: { displayName: 'Member', email: 'member@example.test' },
};
describe('OWNER membership actions retain explicit intentions', () => {
  let http: HttpTestingController;
  let workspace: WorkspaceContext;
  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [WorkspaceMembers],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { snapshot: () => auth } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    workspace = TestBed.inject(WorkspaceContext);
    workspace.confirmSession(auth).subscribe();
    const selected = firstValueFrom(workspace.select(id, () => Promise.resolve(true)));
    http
      .expectOne(`/api/workspaces/${id}`)
      .flush({ id, name: 'Bar', role: 'OWNER', accessVersion: 0 });
    await selected;
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  function setup() {
    const f = TestBed.createComponent(WorkspaceMembers);
    f.detectChanges();
    f.componentInstance.open();
    http
      .expectOne((r) => r.url === `/api/workspaces/${id}/members`)
      .flush({ items: [member], total: 1, accessVersion: 0 });
    f.detectChanges();
    return f;
  }
  it('sends the observed version once, then requires fresh explicit verification', () => {
    const f = setup();
    const c = f.componentInstance;
    c.email.setValue('new@example.test');
    c.add(new Event('submit'));
    const command = http.expectOne(`/api/workspaces/${id}/members`);
    expect(command.request.body).toEqual({ email: 'new@example.test', expectedAccessVersion: 0 });
    command.flush({ accessVersion: 1 });
    f.detectChanges();
    expect(c.email.value).toBe('');
    expect(c.version()).toBeNull();
    http.expectNone(`/api/workspaces/${id}`);
  });
  it('retains email on stale precondition without inferring or retrying a new version', () => {
    const f = setup();
    const c = f.componentInstance;
    c.email.setValue('new@example.test');
    c.add(new Event('submit'));
    http
      .expectOne(`/api/workspaces/${id}/members`)
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(c.email.value).toBe('new@example.test');
    expect(c.version()).toBeNull();
    c.add(new Event('submit'));
    http.expectNone(`/api/workspaces/${id}/members`);
    expect(c.uncertain()).toBe(false);
  });
  it('blocks an uncertain action until the user has refreshed and explicitly acknowledged the list', () => {
    const f = setup();
    const c = f.componentInstance;
    c.email.setValue('new@example.test');
    c.add(new Event('submit'));
    http.expectOne(`/api/workspaces/${id}/members`).error(new ProgressEvent('error'));
    expect(c.uncertain()).toBe(true);
    c.add(new Event('submit'));
    http.expectNone(`/api/workspaces/${id}/members`);
    c.acknowledge();
    expect(c.uncertain()).toBe(true);
    c.refresh();
    http
      .expectOne(`/api/workspaces/${id}`)
      .flush({ id, name: 'Bar', role: 'OWNER', accessVersion: 1 });
    http
      .expectOne((r) => r.url === `/api/workspaces/${id}/members`)
      .flush({ items: [member], total: 1, accessVersion: 1 });
    expect(c.email.value).toBe('new@example.test');
    expect(c.uncertain()).toBe(true);
    http.expectNone((r) => r.method === 'POST');
    c.acknowledge();
    expect(c.uncertain()).toBe(false);
  });
  it('requires confirmation before revocation and sends the specific member with original version', () => {
    const f = setup();
    const c = f.componentInstance;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    c.revoke({ ...member, role: 'MEMBER' });
    http.expectNone((r) => r.method === 'POST');
    confirm.mockReturnValue(true);
    c.revoke({ ...member, role: 'MEMBER' });
    const revoke = http.expectOne(`/api/workspaces/${id}/members/member/revoke`);
    expect(revoke.request.body).toEqual({ expectedAccessVersion: 0 });
    revoke.flush({ accessVersion: 1 });
  });
  it('does not offer management or read members when the selected role is MEMBER', () => {
    workspace.confirmSession(auth).subscribe();
    http
      .expectOne(`/api/workspaces/${id}`)
      .flush({ id, name: 'Bar', role: 'MEMBER', accessVersion: 1 });
    const f = TestBed.createComponent(WorkspaceMembers);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    f.componentInstance.load(true);
    http.expectNone((r) => r.url.endsWith('/members'));
  });
});
