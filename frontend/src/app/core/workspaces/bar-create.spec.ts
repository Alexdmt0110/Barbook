import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';
import { BarCreate } from './bar-create';
const session = { user: { id: 'qa' } };
describe('Explicit Bar creation intent', () => {
  const identity = signal<typeof session | null>(session);
  let http: HttpTestingController;
  beforeEach(() => {
    identity.set(session);
    TestBed.configureTestingModule({
      imports: [BarCreate],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { snapshot: identity } },
        {
          provide: WorkspaceContext,
          useValue: { pendingCommands: signal(0), transitioning: signal(false) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function setup() {
    const f = TestBed.createComponent(BarCreate);
    f.detectChanges();
    f.componentInstance.start();
    f.componentInstance.name = '  Bar QA  ';
    f.componentInstance.accent = 'RED';
    f.componentInstance.confirmed = true;
    f.detectChanges();
    return f;
  }
  it('does not submit without confirmation or open the workspace after successful creation', () => {
    const f = setup();
    const c = f.componentInstance;
    c.confirmed = false;
    c.create();
    http.expectNone('/api/workspaces');
    c.confirmed = true;
    const opened = vi.fn();
    c.open.subscribe(opened);
    c.create();
    const r = http.expectOne('/api/workspaces');
    expect(r.request.body).toMatchObject({ name: 'Bar QA', accentKey: 'RED' });
    expect(r.request.body.creationRequestId).toMatch(/^[0-9a-f-]{36}$/);
    r.flush({ id: 'created', name: 'Bar QA' });
    f.detectChanges();
    expect(opened).not.toHaveBeenCalled();
    expect(c.result()?.id).toBe('created');
    expect((f.nativeElement as HTMLElement).textContent).toContain('Ouvrir le Bar créé');
  });
  it('keeps the exact intention after a lost response, verifies explicitly and never replays automatically', () => {
    const f = setup();
    const c = f.componentInstance;
    c.create();
    const r = http.expectOne('/api/workspaces');
    const payload = r.request.body;
    r.error(new ProgressEvent('error'));
    f.detectChanges();
    expect(c.uncertain()).toBe(true);
    c.create();
    c.cancel();
    http.expectNone('/api/workspaces');
    expect(c.editing()).toBe(true);
    c.inspect();
    http
      .expectOne(`/api/workspaces/creation-intents/${payload.creationRequestId}`)
      .flush({}, { status: 404, statusText: 'Not found' });
    expect(c.notFound()).toBe(true);
    http.expectNone('/api/workspaces');
    c.name = 'Mutation ignored';
    c.accent = 'BLUE';
    c.retry();
    const retry = http.expectOne('/api/workspaces');
    expect(retry.request.body).toEqual(payload);
    retry.flush({ id: 'same', name: 'Bar QA' });
    expect(c.result()?.id).toBe('same');
  });
  it('resolves a committed but lost response by receipt without another POST', () => {
    const f = setup();
    const c = f.componentInstance;
    c.create();
    const r = http.expectOne('/api/workspaces');
    const key = r.request.body.creationRequestId;
    r.error(new ProgressEvent('error'));
    c.inspect();
    http.expectOne(`/api/workspaces/creation-intents/${key}`).flush({ id: 'same', name: 'Bar QA' });
    expect(c.uncertain()).toBe(false);
    expect(c.result()?.id).toBe('same');
    http.expectNone('/api/workspaces');
  });
  it('drops late creation results on account change and clears private form state', () => {
    const f = setup();
    const c = f.componentInstance;
    c.create();
    const r = http.expectOne('/api/workspaces');
    const created = vi.fn();
    c.created.subscribe(created);
    identity.set({ user: { id: 'other' } });
    f.detectChanges();
    r.flush({ id: 'private', name: 'Previous account Bar' });
    f.detectChanges();
    expect(created).not.toHaveBeenCalled();
    expect(c.result()).toBe(null);
    expect(c.name).toBe('');
    expect(c.editing()).toBe(false);
  });
});
