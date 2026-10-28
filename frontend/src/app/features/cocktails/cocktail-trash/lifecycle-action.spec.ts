import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DraftStore } from '../../../core/drafts/draft-store.service';
import { RecipeLifecycle } from '../data-access/cocktail-lifecycle.service';
import { LifecycleAction } from './lifecycle-action';
import { CocktailTrash } from './cocktail-trash';

const state = (deleted = false): RecipeLifecycle => ({
  id: 'recipe-a',
  slug: 'original',
  name: 'Recette A',
  contentVersion: 7,
  organizationVersion: 4,
  deletedAt: deleted ? '2026-10-20T12:00:00Z' : null,
  restoreUntil: deleted ? '2026-11-19T12:00:00Z' : null,
  canRestore: deleted,
});
describe('Explicit personal trash UI', () => {
  let http: HttpTestingController;
  let store: DraftStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(DraftStore);
    store.confirmIdentity({ userId: 'a', workspaceId: 'personal-a' });
  });
  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.restoreAllMocks();
  });
  function setup(restore = false) {
    const f = TestBed.createComponent(LifecycleAction);
    f.componentRef.setInput('recipeId', 'recipe-a');
    f.componentRef.setInput('restore', restore);
    f.detectChanges();
    return f;
  }
  const url = '/api/cocktails/id/recipe-a';
  it('loads an explicit preview, cancels without mutation and sends the captured versions exactly once', () => {
    const f = setup();
    const c = f.componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state());
    http.expectNone((req) => req.method === 'DELETE');
    c.cancel();
    c.confirm();
    http.expectNone((req) => req.method === 'DELETE');
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state());
    c.confirm();
    c.confirm();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ expectedContentVersion: 7, expectedOrganizationVersion: 4 });
    req.flush({ ...state(true), contentVersion: 8, organizationVersion: 5 });
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Recette placée en corbeille');
  });
  it('requires a separate confirmation to restore, preserving its own version snapshot', () => {
    const f = setup(true);
    const c = f.componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state(true));
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Confirmer la restauration');
    c.confirm();
    const req = http.expectOne(`${url}/restore`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expectedContentVersion: 7, expectedOrganizationVersion: 4 });
    req.flush(state());
    expect(c.result()?.deletedAt).toBeNull();
  });
  it('blocks an obsolete intention after409 without fetching or resubmitting automatically', () => {
    const c = setup().componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state());
    c.confirm();
    http.expectOne(url).flush({}, { status: 409, statusText: 'Conflict' });
    expect(c.prepared()).toBeNull();
    expect(c.error()).toContain('changé');
    c.confirm();
    http.expectNone(() => true);
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush({ ...state(), contentVersion: 8 });
    http.expectNone((req) => req.method === 'DELETE');
    c.confirm();
    const req = http.expectOne(url);
    expect(req.request.body.expectedContentVersion).toBe(8);
    req.flush(state(true));
  });
  it('reconciles a lost response by explicit GET, without repeating a committed deletion', () => {
    const c = setup().componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state());
    c.confirm();
    http.expectOne(url).error(new ProgressEvent('network'));
    expect(c.error()).toContain('peut-être été enregistrée');
    c.confirm();
    http.expectNone(() => true);
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state(true));
    expect(c.result()?.deletedAt).not.toBeNull();
    c.confirm();
    http.expectNone(() => true);
  });
  it('never offers restoration when the server says the window expired', () => {
    const f = setup(true);
    const c = f.componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush({ ...state(true), canRestore: false });
    f.detectChanges();
    c.confirm();
    http.expectNone((req) => req.method === 'POST');
    expect(c.error()).toContain('ne signifie pas');
    expect((f.nativeElement as HTMLElement).textContent).not.toContain('Confirmer la restauration');
  });
  it.each(['suspend', 'account'] as const)(
    'discards responses and blocks mutation after %s',
    (change) => {
      const c = setup().componentInstance;
      c.prepare();
      const req = http.expectOne(`${url}/lifecycle`);
      if (change === 'suspend') store.suspend();
      else store.confirmIdentity({ userId: 'b', workspaceId: 'personal-b' });
      req.flush(state());
      expect(c.prepared()).toBeNull();
      c.confirm();
      c.prepare();
      http.expectNone(() => true);
    },
  );
  it('discards a late mutation response after identity changes', () => {
    const c = setup().componentInstance;
    c.prepare();
    http.expectOne(`${url}/lifecycle`).flush(state());
    c.confirm();
    const req = http.expectOne(url);
    store.suspend();
    req.flush(state(true));
    expect(c.result()).toBeNull();
  });
  it('cancels the previous read when the recipe input changes', () => {
    const f = setup();
    const c = f.componentInstance;
    c.prepare();
    const req = http.expectOne(`${url}/lifecycle`);
    f.componentRef.setInput('recipeId', 'recipe-b');
    f.detectChanges();
    expect(req.cancelled).toBe(true);
    c.prepare();
    http.expectOne('/api/cocktails/id/recipe-b/lifecycle').flush({ ...state(), id: 'recipe-b' });
    expect(c.prepared()?.id).toBe('recipe-b');
  });
  it('paginates and refreshes explicitly without retaining entries from an old request', () => {
    const f = TestBed.createComponent(CocktailTrash);
    f.detectChanges();
    const first = http.expectOne('/api/cocktails/trash/entries?page=1&pageSize=20');
    first.flush({ items: [state(true)], total: 21, page: 1, pageSize: 20 });
    f.componentInstance.load(2);
    expect(f.componentInstance.result()).toBeNull();
    http
      .expectOne('/api/cocktails/trash/entries?page=2&pageSize=20')
      .flush({ items: [], total: 20, page: 2, pageSize: 20 });
    expect(f.componentInstance.page()).toBe(2);
    f.componentInstance.load(1);
    const req = http.expectOne('/api/cocktails/trash/entries?page=1&pageSize=20');
    store.suspend();
    req.flush({ items: [state(true)], total: 1, page: 1, pageSize: 20 });
    expect(f.componentInstance.result()).toBeNull();
  });
});
