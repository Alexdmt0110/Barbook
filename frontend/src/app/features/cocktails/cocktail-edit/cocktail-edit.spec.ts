import { WorkspaceContext } from '../../../core/workspaces/workspace-context';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { CocktailOrganizationEditor } from '../cocktail-detail/cocktail-organization-editor/cocktail-organization-editor';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { DraftStore, DRAFT_TTL } from '../../../core/drafts/draft-store.service';
import { BrowserStorageService } from '../../../core/storage/browser-storage.service';
import { IngredientsService } from '../../ingredients/data-access/ingredients.service';
import { CocktailContentSnapshot } from '../data-access/cocktail-content.models';
import { CocktailEdit } from './cocktail-edit';
import { completeContent } from './cocktail-edit.test-fixture';

describe('Personal recipe editing UI and L4 drafts', () => {
  let http: HttpTestingController;
  let store: DraftStore;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  const path = '/api/cocktails/id/recipe-a/content';
  const snapshot = (version = 7): CocktailContentSnapshot => ({
    id: 'recipe-a',
    slug: 'original-url',
    contentVersion: version,
    organizationVersion: 4,
    content: completeContent(),
  });
  beforeEach(() => {
    sessionStorage.clear();
    params = new BehaviorSubject(convertToParamMap({ id: 'recipe-a' }));
    TestBed.configureTestingModule({
      imports: [CocktailEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { paramMap: params.value } },
        },
        { provide: IngredientsService, useValue: { searchPersonalIngredients: () => of([]) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(DraftStore);
    TestBed.inject(WorkspaceContext)
      .confirmSession({
        user: { id: 'alice', email: 'qa@example.test', displayName: 'QA' },
        workspaceId: 'personal-a',
        csrfToken: 'csrf',
      })
      .subscribe();
  });
  afterEach(() => {
    http.verify({ ignoreCancelled: true });
    vi.restoreAllMocks();
  });
  function setup(version = 7) {
    const fixture = TestBed.createComponent(CocktailEdit);
    fixture.detectChanges();
    http.expectOne(path).flush(snapshot(version));
    fixture.detectChanges();
    return fixture;
  }
  it('loads organization only on explicit request, preserves its draft on content save and guards both forms', () => {
    const f = setup();
    const c = f.componentInstance;
    http.expectNone('/api/cocktails/original-url');
    c.loadOrganization();
    c.loadOrganization();
    http.expectOne('/api/cocktails/original-url').flush({
      id: 'recipe-a',
      slug: 'original-url',
      folders: [],
      tags: [],
      organizationVersion: 4,
    });
    f.detectChanges();
    http.expectOne((r) => r.url === '/api/folders/browse').flush({ items: [], totalPages: 0 });
    http.expectOne('/api/tags').flush([]);
    f.detectChanges();
    const editor = f.debugElement.query(By.directive(CocktailOrganizationEditor))
      .componentInstance as CocktailOrganizationEditor;
    editor.newTagName.set('Classement en cours');
    editor.addTag();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    c.submit();
    http.expectOne(path).flush(snapshot());
    f.detectChanges();
    expect(editor.selectedTagNames()).toEqual(['Classement en cours']);
    expect(c.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalled();
    expect(store.find(store.lease(), 'organization:recipe-a')).not.toBeNull();
    http.expectNone((r) => r.method === 'PUT' && r.url.endsWith('/organization'));
  });
  it('keeps organization loading errors explicit and retries only after another action', () => {
    const c = setup().componentInstance;
    c.loadOrganization();
    http
      .expectOne('/api/cocktails/original-url')
      .flush({}, { status: 404, statusText: 'Not found' });
    expect(c.organizationError()).toContain('plus disponible');
    http.expectNone('/api/cocktails/original-url');
    c.loadOrganization();
    http.expectOne('/api/cocktails/original-url').flush({ id: 'foreign', slug: 'original-url' });
    expect(c.organization()).toBeNull();
    expect(c.organizationError()).toContain('ne correspond pas');
  });
  it('ignores late organization data after identity change', () => {
    const c = setup().componentInstance;
    c.loadOrganization();
    const req = http.expectOne('/api/cocktails/original-url');
    store.purge();
    store.confirmIdentity({ userId: 'bob', workspaceId: 'personal-b' });
    req.flush({
      id: 'recipe-a',
      slug: 'original-url',
      folders: [],
      tags: [],
      organizationVersion: 4,
    });
    expect(c.organization()).toBeNull();
    c.loadOrganization();
    http.expectNone('/api/cocktails/original-url');
  });
  it('prefills every field, all sources and order, without capturing a draft or sending a PUT', () => {
    const f = setup();
    const c = f.componentInstance;
    expect(c.form.controls.name.value).toBe(completeContent().name);
    expect(
      c.form.controls.ingredients.getRawValue().map((i) => [i.abvMode, i.abvOverride]),
    ).toEqual([
      ['INHERIT', null],
      ['OVERRIDE', 0],
      ['OVERRIDE', 40],
      ['UNKNOWN', null],
      ['INHERIT', null],
    ]);
    expect(c.form.controls.garnishes.length).toBe(2);
    expect(c.form.controls.steps.getRawValue()).toEqual(['Shaker.', 'Filtrer.']);
    expect(store.find(store.lease(), 'edit:recipe-a')).toBeNull();
    expect((f.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Modifier');
    http.expectNone((req) => req.method === 'PUT');
  });
  it('sends exactly the loaded content version for no-op and clears only its draft on success', () => {
    const c = setup().componentInstance;
    store.save(store.lease(), 'organization:recipe-a', 4, { keep: true });
    c.submit();
    const req = http.expectOne(path);
    expect(req.request.body).toEqual({ ...completeContent(), expectedContentVersion: 7 });
    expect(store.find(store.lease(), 'edit:recipe-a')?.uncertain).toBe(true);
    req.flush(snapshot());
    expect(c.draft()?.dirty()).toBe(false);
    expect(c.success()).toContain('inchangée');
    expect(store.find(store.lease(), 'organization:recipe-a')).not.toBeNull();
  });
  it('preserves a conflict, only reads on comparison and requires explicit abandonment before adopting a new version', () => {
    const c = setup().componentInstance;
    c.form.controls.name.setValue('Ma saisie');
    c.submit();
    http.expectOne(path).flush({}, { status: 409, statusText: 'Conflict' });
    c.submit();
    http.expectNone(path);
    expect(c.form.controls.name.value).toBe('Ma saisie');
    c.compareServer();
    const read = http.expectOne(path);
    expect(read.request.method).toBe('GET');
    read.flush({ ...snapshot(8), content: { ...completeContent(), name: 'Autre éditeur' } });
    expect(c.form.controls.name.value).toBe('Ma saisie');
    c.submit();
    http.expectNone(path);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    c.useServer();
    expect(c.blocked()).toBe(true);
    vi.mocked(window.confirm).mockReturnValue(true);
    c.useServer();
    expect(c.form.controls.name.value).toBe('Autre éditeur');
    c.form.controls.notes.setValue('Nouvelle intention');
    c.submit();
    const put = http.expectOne(path);
    expect(put.request.body.expectedContentVersion).toBe(8);
    put.flush(snapshot(9));
  });
  it('keeps a lost response uncertain across remount, blocks replay and omits the generic unlock action', () => {
    const first = setup();
    first.componentInstance.form.controls.notes.setValue('Sauvegarde peut-être committée');
    first.componentInstance.submit();
    http.expectOne(path).error(new ProgressEvent('error'));
    first.componentInstance.submit();
    http.expectNone(path);
    first.destroy();
    const next = setup(8);
    next.componentInstance.restoreDraft();
    next.detectChanges();
    expect(next.componentInstance.draft()?.uncertain()).toBe(true);
    expect(next.componentInstance.draft()?.conflict()).toBe(true);
    expect(next.componentInstance.form.controls.notes.value).toBe('Sauvegarde peut-être committée');
    expect((next.nativeElement as HTMLElement).textContent).not.toContain(
      'J’ai vérifié : autoriser',
    );
    next.componentInstance.submit();
    http.expectNone(path);
  });
  it('restores a stale draft for inspection with its old version and never submits it', () => {
    const first = setup();
    first.componentInstance.form.controls.name.setValue('Brouillon ancien');
    first.destroy();
    const second = setup(8);
    const c = second.componentInstance;
    expect(c.form.controls.name.value).toBe(completeContent().name);
    c.submit();
    http.expectNone(path);
    c.restoreDraft();
    expect(c.form.controls.name.value).toBe('Brouillon ancien');
    expect(c.draft()?.conflict()).toBe(true);
    c.submit();
    http.expectNone(path);
    expect(store.find(store.lease(), 'edit:recipe-a')?.version).toBe(7);
  });
  it('keeps the TTL fixed during a restore prompt and refuses restoration at the exact boundary', () => {
    const first = setup();
    first.componentInstance.form.controls.notes.setValue('Expires');
    first.destroy();
    const entry = store.find(store.lease(), 'edit:recipe-a')!;
    const second = setup();
    vi.spyOn(Date, 'now').mockReturnValue(entry.savedAt + DRAFT_TTL);
    second.componentInstance.restoreDraft();
    expect(second.componentInstance.draft()?.invalid()).toBe(true);
    expect(second.componentInstance.form.controls.notes.value).toBe(completeContent().notes);
    http.expectNone(path);
  });
  it('retains an involuntary expiration draft, restores after identity reconfirmation and purges on account/workspace change', () => {
    const first = setup();
    first.componentInstance.form.controls.notes.setValue('Privé');
    store.suspend();
    first.componentInstance.submit();
    http.expectNone(path);
    first.destroy();
    TestBed.inject(WorkspaceContext)
      .confirmSession({
        user: { id: 'alice', email: 'qa@example.test', displayName: 'QA' },
        workspaceId: 'personal-a',
        csrfToken: 'csrf',
      })
      .subscribe();
    const resumed = setup();
    resumed.componentInstance.restoreDraft();
    expect(resumed.componentInstance.form.controls.notes.value).toBe('Privé');
    store.confirmIdentity({ userId: 'alice', workspaceId: 'other-workspace' });
    resumed.componentInstance.submit();
    http.expectNone(path);
    expect(store.find(store.lease(), 'edit:recipe-a')).toBeNull();
    store.confirmIdentity({ userId: 'bob', workspaceId: 'personal-b' });
    expect(store.find(store.lease(), 'edit:recipe-a')).toBeNull();
  });
  it.each(['success', 'failure'])(
    'ignores a late %s after account change and cannot recreate purged data',
    (kind) => {
      const c = setup().componentInstance;
      c.form.controls.name.setValue('Ancien compte');
      c.submit();
      const req = http.expectOne(path);
      store.purge();
      store.confirmIdentity({ userId: 'bob', workspaceId: 'personal-b' });
      if (kind === 'success') req.flush(snapshot(8));
      else req.error(new ProgressEvent('error'));
      expect(c.success()).toBeNull();
      expect(c.error()).toBeNull();
      expect(store.find(store.lease(), 'edit:recipe-a')).toBeNull();
    },
  );
  it('cancels prior reads when an ID changes, leaves the old recipe draft isolated and rejects an ID mismatch', () => {
    const f = setup();
    f.componentInstance.form.controls.notes.setValue('Only A');
    params.next(convertToParamMap({ id: 'recipe-b' }));
    const old = http.expectOne('/api/cocktails/id/recipe-b/content');
    params.next(convertToParamMap({ id: 'recipe-c' }));
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/cocktails/id/recipe-c/content').flush(snapshot());
    expect(f.componentInstance.loaded()).toBeNull();
    expect(store.find(store.lease(), 'edit:recipe-a')).not.toBeNull();
    http.expectNone((req) => req.method === 'PUT');
  });
  it('shows storage failure honestly and blocks before HTTP if no uncertainty marker can be protected', () => {
    const f = setup();
    const c = f.componentInstance;
    const storage = TestBed.inject(BrowserStorageService);
    vi.spyOn(storage, 'write').mockReturnValue(false);
    vi.spyOn(storage, 'remove').mockReturnValue(false);
    c.form.controls.notes.setValue('En mémoire');
    c.submit();
    f.detectChanges();
    expect(c.draft()?.submissionBlocked()).toBe(true);
    http.expectNone(path);
    expect((f.nativeElement as HTMLElement).textContent).toContain(
      'Stockage navigateur indisponible',
    );
    expect((f.nativeElement as HTMLElement).textContent).not.toContain(
      'Brouillon temporaire dans cet onglet, 24 heures maximum',
    );
  });
  it('preserves raw controls, modes and order during explicit keyboard-friendly moves', () => {
    const c = setup().componentInstance;
    const row = c.form.controls.ingredients.at(1);
    c.move('ingredients', 1, -1);
    expect(c.form.controls.ingredients.at(0)).toBe(row);
    expect(c.form.controls.ingredients.at(0).controls.abvOverride.value).toBe(0);
    c.move('steps', 1, -1);
    expect(c.form.controls.steps.getRawValue()).toEqual(['Filtrer.', 'Shaker.']);
    expect(store.find(store.lease(), 'edit:recipe-a')).not.toBeNull();
  });
  it('guards unsaved navigation, allows cancellation without purge and only abandons after confirmation', () => {
    const c = setup().componentInstance;
    c.form.controls.notes.setValue('Conserver');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(c.canLeave()).toBe(false);
    c.discardDraft();
    expect(c.form.controls.notes.value).toBe('Conserver');
    confirm.mockReturnValue(true);
    expect(c.canLeave()).toBe(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.cancel();
    expect(navigate).toHaveBeenCalledWith(['/cocktails', 'original-url']);
    expect(store.find(store.lease(), 'edit:recipe-a')).not.toBeNull();
    c.discardDraft();
    expect(c.form.controls.notes.value).toBe(completeContent().notes);
    expect(store.find(store.lease(), 'edit:recipe-a')).toBeNull();
  });
  it('focuses a real invalid field and the main-alcohol selector instead of an unfocusable form group', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    c.form.controls.name.setValue('');
    fixture.detectChanges();
    c.submit();
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector('input[formControlName="name"]'),
    );
    c.form.controls.name.setValue('Valid');
    c.form.controls.mainAlcoholName.setValue('Unknown');
    fixture.detectChanges();
    c.submit();
    expect(document.activeElement).toBe(
      (fixture.nativeElement as HTMLElement).querySelector(
        'select[formControlName="mainAlcoholName"]',
      ),
    );
    http.expectNone(path);
  });
  it('separates the accessible ABV name from help text and keeps explicit zero visible', () => {
    const f = setup();
    const root = f.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[formControlName="abvOverride"]')!;
    expect(root.querySelector('#' + input.getAttribute('aria-labelledby'))?.textContent).toBe(
      'Degré pour cette recette 2 (%)',
    );
    expect(root.querySelector('#' + input.getAttribute('aria-describedby'))?.textContent).toContain(
      '0 % est une valeur explicite.',
    );
    expect(input.value).toBe('0');
  });
  it('releases the pending transport on destruction but preserves uncertainty and the captured version', () => {
    const f = setup();
    f.componentInstance.form.controls.notes.setValue('Pending edit');
    f.componentInstance.submit();
    const pending = http.expectOne(path);
    expect(store.hasPendingMutation()).toBe(true);
    expect(pending.request.body.expectedContentVersion).toBe(7);
    f.destroy();
    expect(pending.cancelled).toBe(true);
    expect(store.hasPendingMutation()).toBe(false);
    expect(store.find(store.lease(), 'edit:recipe-a')).toMatchObject({
      version: 7,
      uncertain: true,
    });
  });

});
