import { WorkspaceContext } from '../../../../core/workspaces/workspace-context';
import { provideRouter } from '@angular/router';
import { DraftStore } from '../../../../core/drafts/draft-store.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CocktailOrganizationResult } from '../../data-access/cocktail.models';
import { CocktailOrganizationEditor } from './cocktail-organization-editor';

const a = { id: 'a', name: 'Classiques' };
const b = { id: 'b', name: 'Favoris' };
const tag = { id: 'tag', name: 'Classique', slug: 'classique' };

describe('CocktailOrganizationEditor', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CocktailOrganizationEditor],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(WorkspaceContext)
      .confirmSession({
        user: { id: 'test-user', email: 'qa@example.test', displayName: 'QA' },
        workspaceId: 'test-workspace',
        csrfToken: 'csrf',
      })
      .subscribe();
  });
  afterEach(() => http.verify());
  function catalog(items = [a, b], pages = 1) {
    http.expectOne('/api/tags').flush([tag]);
    http
      .expectOne((req) => req.url === '/api/folders/browse')
      .flush({ items, total: items.length, page: 1, pageSize: 25, totalPages: pages });
  }
  function setup(version = 4, recipeId = 'recipe-a') {
    TestBed.inject(DraftStore).confirmIdentity({
      userId: 'test-user',
      workspaceId: 'test-workspace',
    });
    const fixture = TestBed.createComponent(CocktailOrganizationEditor);
    fixture.componentRef.setInput('cocktailId', recipeId);
    fixture.componentRef.setInput('slug', 'daiquiri');
    fixture.componentRef.setInput('organizationVersion', version);
    fixture.componentRef.setInput('folders', [a]);
    fixture.componentRef.setInput('tags', [tag]);
    fixture.detectChanges();
    catalog();
    fixture.detectChanges();
    return fixture;
  }
  function checkbox(root: HTMLElement, name: string) {
    const label = [...root.querySelectorAll('label')].find((el) => el.textContent?.trim() === name);
    return label?.querySelector('input') as HTMLInputElement;
  }

  it('renders the checked folder and canonical selected tags', () => {
    const fixture = setup();
    expect(checkbox(fixture.nativeElement, 'Classiques').checked).toBe(true);
    expect(checkbox(fixture.nativeElement, 'Favoris').checked).toBe(false);
    expect(fixture.componentInstance.selectedTagNames()).toEqual(['Classique']);
  });

  it('creates and selects a new folder without losing existing selections in the DOM', () => {
    const fixture = setup();
    fixture.componentInstance.newFolderName.set('  Soirée  ');
    fixture.componentInstance.createFolder();
    const request = http.expectOne('/api/folders');
    expect(request.request.body).toEqual({ name: 'Soirée' });
    request.flush({ id: 'c', name: 'Soirée' });
    fixture.detectChanges();
    expect(checkbox(fixture.nativeElement, 'Classiques').checked).toBe(true);
    expect(checkbox(fixture.nativeElement, 'Soirée').checked).toBe(true);
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['a', 'c']);
  });

  it('sends the entire set and expected version, applies the returned version for a consecutive save', () => {
    const fixture = setup();
    checkbox(fixture.nativeElement, 'Favoris').click();
    fixture.componentInstance.newTagName.set(' Tropical ');
    fixture.componentInstance.addTag();
    fixture.componentInstance.saveOrganization();
    const request = http.expectOne('/api/cocktails/daiquiri/organization');
    expect(request.request.body).toEqual({
      folderIds: ['a', 'b'],
      tagNames: ['Classique', 'Tropical'],
      expectedVersion: 4,
    });
    const result: CocktailOrganizationResult = {
      folder: a,
      folders: [a, b],
      tags: [tag],
      organizationVersion: 5,
    };
    request.flush(result);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Organisation enregistrée.');
    fixture.componentInstance.saveOrganization();
    const second = http.expectOne('/api/cocktails/daiquiri/organization');
    expect(second.request.body.expectedVersion).toBe(5);
    second.flush({ ...result, organizationVersion: 6 });
  });

  it('removes a folder or tag locally without changing the other draft fields', () => {
    const fixture = setup();
    checkbox(fixture.nativeElement, 'Favoris').click();
    fixture.componentInstance.removeFolder('a');
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['b']);
    expect(fixture.componentInstance.selectedTagNames()).toEqual(['Classique']);
    fixture.componentInstance.removeTag('Classique');
    expect(fixture.componentInstance.selectedTagNames()).toEqual([]);
  });

  it('keeps the name and selections when creation collides', () => {
    const fixture = setup();
    fixture.componentInstance.newFolderName.set('Classiques');
    fixture.componentInstance.createFolder();
    http.expectOne('/api/folders').flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Un dossier portant ce nom existe déjà.');
    expect(fixture.componentInstance.newFolderName()).toBe('Classiques');
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['a']);
  });

  it('keeps the full draft on 409 and replaces it only on explicit, successful reload', () => {
    const fixture = setup();
    checkbox(fixture.nativeElement, 'Favoris').click();
    fixture.componentInstance.newTagName.set('Draft');
    fixture.componentInstance.addTag();
    fixture.componentInstance.saveOrganization();
    http
      .expectOne('/api/cocktails/daiquiri/organization')
      .flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['a', 'b']);
    expect(fixture.componentInstance.selectedTagNames()).toEqual(['Classique', 'Draft']);
    expect(fixture.nativeElement.textContent).toContain('Ton brouillon est conservé.');
    fixture.componentInstance.reloadOrganization();
    http.expectOne('/api/cocktails/daiquiri').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['a', 'b']);
    fixture.componentInstance.reloadOrganization();
    http
      .expectOne('/api/cocktails/daiquiri')
      .flush({ id: 'recipe-a', folder: b, folders: [b], tags: [], organizationVersion: 8 });
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['b']);
    expect(fixture.componentInstance.selectedTagNames()).toEqual([]);
    fixture.componentInstance.saveOrganization();
    const request = http.expectOne('/api/cocktails/daiquiri/organization');
    expect(request.request.body).toEqual({ folderIds: ['b'], tagNames: [], expectedVersion: 8 });
    request.flush({ folder: b, folders: [b], tags: [], organizationVersion: 9 });
  });

  it('preserves selected IDs across catalog pages and search without resetting the draft', () => {
    const fixture = setup();
    fixture.componentInstance.loadCatalogs(2);
    catalog([{ id: 'c', name: 'Soirée' }], 2);
    fixture.detectChanges();
    checkbox(fixture.nativeElement, 'Soirée').click();
    fixture.componentInstance.folderSearch.set('Favoris');
    fixture.componentInstance.loadCatalogs(1);
    catalog([b]);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedFolderIds()).toEqual(['a', 'c']);
    expect(fixture.componentInstance.selectedTagNames()).toEqual(['Classique']);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Dossiers sélectionnés"]').textContent,
    ).toContain('Soirée');
  });

  it('keeps a partially typed tag when selecting a known tag', () => {
    const fixture = setup();
    fixture.componentInstance.removeTag('Classique');
    fixture.componentInstance.newTagName.set('Unfinished');
    fixture.detectChanges();
    checkbox(fixture.nativeElement, 'Classique').click();
    expect(fixture.componentInstance.newTagName()).toBe('Unfinished');
    expect(fixture.componentInstance.selectedTagNames()).toEqual(['Classique']);
  });
  it('restores only this recipe and retains its original version against a newer server state', () => {
    const first = setup();
    first.componentInstance.newTagName.set('unfinished');
    first.componentInstance.removeFolder('a');
    first.destroy();
    const other = setup(4, 'recipe-b');
    expect(other.componentInstance.draft.candidate()).toBeNull();
    other.destroy();
    const restored = setup(8);
    expect(restored.componentInstance.draft.candidate()).not.toBeNull();
    restored.componentInstance.saveOrganization();
    http.expectNone('/api/cocktails/daiquiri/organization');
    restored.componentInstance.restoreDraft();
    expect(restored.componentInstance.newTagName()).toBe('unfinished');
    expect(restored.componentInstance.selectedFolderIds()).toEqual([]);
    expect(restored.componentInstance.hasConflict()).toBe(true);
    restored.componentInstance.saveOrganization();
    http.expectNone('/api/cocktails/daiquiri/organization');
    restored.componentInstance.reloadOrganization();
    http
      .expectOne('/api/cocktails/daiquiri')
      .flush({ id: 'recipe-a', folder: b, folders: [b], tags: [], organizationVersion: 8 });
    restored.componentInstance.saveOrganization();
    const request = http.expectOne('/api/cocktails/daiquiri/organization');
    expect(request.request.body.expectedVersion).toBe(8);
    request.flush({ folder: b, folders: [b], tags: [], organizationVersion: 9 });
  });
  it('preserves the restored version when a second client wins after restore and keeps the draft on 409', () => {
    const first = setup();
    first.componentInstance.removeTag('Classique');
    first.destroy();
    const restored = setup();
    restored.componentInstance.restoreDraft();
    restored.componentInstance.saveOrganization();
    const request = http.expectOne('/api/cocktails/daiquiri/organization');
    expect(request.request.body.expectedVersion).toBe(4);
    request.flush({}, { status: 409, statusText: 'Conflict' });
    expect(restored.componentInstance.selectedTagNames()).toEqual([]);
    expect(restored.componentInstance.draft.dirty()).toBe(true);
    expect(restored.componentInstance.hasConflict()).toBe(true);
  });
  it('keeps folder creation uncertainty distinct from successful organization and rejects a replacement recipe', () => {
    const fixture = setup();
    fixture.componentInstance.newFolderName.set('new');
    fixture.componentInstance.createFolder();
    http.expectOne('/api/folders').error(new ProgressEvent('error'));
    expect(fixture.componentInstance.draft.uncertain()).toBe(true);
    fixture.componentInstance.saveOrganization();
    http.expectNone('/api/cocktails/daiquiri/organization');
    fixture.componentInstance.reloadOrganization();
    http
      .expectOne('/api/cocktails/daiquiri')
      .flush({ id: 'different', folders: [], tags: [], organizationVersion: 1 });
    expect(fixture.componentInstance.draft.uncertain()).toBe(true);
  });
});
