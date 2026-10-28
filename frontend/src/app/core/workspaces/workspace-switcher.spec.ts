import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { WorkspaceContext } from './workspace-context';
import { WorkspaceSwitcher } from './workspace-switcher';
const session = {
  user: { id: 'qa', displayName: 'QA', email: 'qa@example.test' },
  workspaceId: 'personal',
  csrfToken: 'csrf',
};
describe('Profile workspace catalogue', () => {
  const identity = signal<typeof session | null>(session);
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    identity.set(session);
    TestBed.configureTestingModule({
      imports: [WorkspaceSwitcher],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { snapshot: identity, isAuthenticated: () => !!identity() },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(WorkspaceContext).confirmSession(session).subscribe();
  });
  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });
  function setup() {
    const fixture = TestBed.createComponent(WorkspaceSwitcher);
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    return fixture;
  }
  it('pins Personnel separately and distinguishes a genuinely empty Bar list from loading', () => {
    const f = setup();
    const host = f.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('aucun Bar');
    const request = http.expectOne((r) => r.url === '/api/workspaces');
    expect(request.request.params.get('kind')).toBe('SHARED');
    request.flush({ items: [], total: 0, page: 1, pageSize: 25 });
    f.detectChanges();
    expect(host.textContent).toContain('aucun Bar');
    expect(host.querySelector('button')?.textContent).toContain('Personnel · privé');
  });
  it('reports a catalogue error instead of presenting first-Bar eligibility', () => {
    const f = setup();
    http
      .expectOne((r) => r.url === '/api/workspaces')
      .flush({}, { status: 500, statusText: 'Failure' });
    f.detectChanges();
    const host = f.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('n’est pas disponible');
    expect(host.textContent).not.toContain('aucun Bar');
  });
  it('preserves total across an empty later page and does not imply zero membership', () => {
    const f = setup();
    http
      .expectOne((r) => r.url === '/api/workspaces')
      .flush({ items: [{ id: 'bar', name: 'Bar test' }], total: 2, page: 1, pageSize: 1 });
    f.detectChanges();
    f.componentInstance.load(false);
    const second = http.expectOne((r) => r.url === '/api/workspaces');
    expect(second.request.params.get('page')).toBe('2');
    second.flush({ items: [], total: 2, page: 2, pageSize: 1 });
    f.detectChanges();
    expect(f.componentInstance.total()).toBe(2);
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('aucun Bar');
  });
  it('removes catalogue names on logout and ignores an earlier pending response', () => {
    const f = setup();
    const pending = http.expectOne((r) => r.url === '/api/workspaces');
    identity.set(null);
    f.detectChanges();
    pending.flush({
      items: [{ id: 'old', name: 'Private old Bar' }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    f.detectChanges();
    expect(f.componentInstance.bars()).toEqual([]);
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('Private old Bar');
  });
});
