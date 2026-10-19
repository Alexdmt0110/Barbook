import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { FolderCocktailPicker } from '../folder-cocktail-picker/folder-cocktail-picker';
import { BehaviorSubject } from 'rxjs';
import { FolderDetail } from './folder-detail';

const metadata = { id: 'a', name: 'Classiques', version: 5, cocktailCount: 0 };
const empty = { items: [], total: 0, page: 1, pageSize: 24, totalPages: 0 };

describe('FolderDetail', () => {
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ id: 'a' }));
    TestBed.configureTestingModule({
      imports: [FolderDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  function setup() {
    const fixture = TestBed.createComponent(FolderDetail);
    fixture.detectChanges();
    http.expectOne('/api/folders/a').flush(metadata);
    http.expectOne((req) => req.url === '/api/cocktails').flush(empty);
    fixture.detectChanges();
    return fixture;
  }
  it('renders an empty dossier and opens the paginated picker', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Aucune recette à afficher');
    fixture.componentInstance.togglePicker();
    fixture.detectChanges();
    const candidates = http.expectOne((req) => req.url === '/api/cocktails');
    expect(candidates.request.params.get('folderId')).toBeNull();
    expect(candidates.request.params.get('pageSize')).toBe('12');
    candidates.flush({ ...empty, pageSize: 12 });
  });
  it('keeps a stale rename draft and its version until an explicit successful reload', () => {
    const fixture = setup();
    fixture.componentInstance.renameName.set('Brouillon');
    fixture.componentInstance.rename();
    const rename = http.expectOne('/api/folders/a');
    expect(rename.request.body).toEqual({ name: 'Brouillon', expectedVersion: 5 });
    rename.flush({}, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance.renameName()).toBe('Brouillon');
    expect(fixture.componentInstance.folder()?.version).toBe(5);
    fixture.componentInstance.reload();
    http.expectOne('/api/folders/a').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.renameName()).toBe('Brouillon');
    fixture.componentInstance.reload();
    http.expectOne('/api/folders/a').flush({ ...metadata, name: 'Distant', version: 6 });
    http.expectOne((req) => req.url === '/api/cocktails').flush(empty);
    expect(fixture.componentInstance.renameName()).toBe('Distant');
    fixture.componentInstance.renameName.set('Nouveau');
    fixture.componentInstance.rename();
    const fresh = http.expectOne('/api/folders/a');
    expect(fresh.request.body.expectedVersion).toBe(6);
    fresh.flush({ ...metadata, name: 'Nouveau', version: 7 });
  });
  it('requires explicit deletion confirmation and sends the observed metadata version', () => {
    const fixture = setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.remove();
    http.expectNone((req) => req.method === 'DELETE');
    confirm.mockReturnValue(true);
    fixture.componentInstance.remove();
    const request = http.expectOne('/api/folders/a?expectedVersion=5');
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining(
        'Les cocktails, leurs tags et leurs autres dossiers seront conservés.',
      ),
    );
    request.flush({ deleted: true });
    expect(navigate).toHaveBeenCalledWith(['/folders']);
  });
  it('removes a local link, returns from an emptied last page, and preserves an unrelated rename draft', () => {
    const fixture = setup();
    fixture.componentInstance.renameName.set('Unsaved');
    fixture.componentInstance.loadMembers(2);
    http
      .expectOne((req) => req.url === '/api/cocktails')
      .flush({
        items: [{ id: 'one', slug: 'one', name: 'One' }],
        total: 25,
        page: 2,
        pageSize: 24,
        totalPages: 2,
      });
    fixture.componentInstance.removeCocktail('one');
    http.expectOne('/api/folders/a/cocktails/one').flush({ removed: 1 });
    http
      .expectOne((req) => req.url === '/api/cocktails')
      .flush({ ...empty, total: 24, page: 2, totalPages: 1 });
    const previous = http.expectOne((req) => req.url === '/api/cocktails');
    expect(previous.request.params.get('page')).toBe('1');
    previous.flush({ ...empty, total: 24, totalPages: 1 });
    expect(fixture.componentInstance.page()).toBe(1);
    expect(fixture.componentInstance.renameName()).toBe('Unsaved');
    expect(fixture.componentInstance.folder()?.version).toBe(5);
    expect(fixture.componentInstance.folder()?.cocktailCount).toBe(24);
  });
  it('uses a uniform not-found view without loading member data', () => {
    const fixture = TestBed.createComponent(FolderDetail);
    fixture.detectChanges();
    http.expectOne('/api/folders/a').flush({}, { status: 404, statusText: 'Not found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Dossier introuvable');
    http.expectNone((req) => req.url === '/api/cocktails');
  });
  it('cancels requests from the previous route before showing another folder', () => {
    const fixture = setup();
    fixture.componentInstance.renameName.set('Old draft');
    fixture.componentInstance.rename();
    const old = http.expectOne('/api/folders/a');
    params.next(convertToParamMap({ id: 'b' }));
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/folders/b').flush({ ...metadata, id: 'b', name: 'Other', version: 2 });
    const members = http.expectOne((req) => req.url === '/api/cocktails');
    expect(members.request.params.get('folderId')).toBe('b');
    members.flush(empty);
    fixture.detectChanges();
    expect(fixture.componentInstance.folder()?.id).toBe('b');
    expect(fixture.componentInstance.renameName()).toBe('Other');
    expect(fixture.componentInstance.isMutating()).toBe(false);
  });
  it('keeps a pending selection when the picker is collapsed and reopened', () => {
    const fixture = setup();
    fixture.componentInstance.togglePicker();
    fixture.detectChanges();
    http.expectOne((req) => req.url === '/api/cocktails').flush(empty);
    const picker = fixture.debugElement.query(By.directive(FolderCocktailPicker))
      .componentInstance as FolderCocktailPicker;
    picker.selected.set([{ id: 'one', name: 'One' }]);
    fixture.componentInstance.togglePicker();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#folder-picker') as HTMLElement).hidden).toBe(
      true,
    );
    fixture.componentInstance.togglePicker();
    fixture.detectChanges();
    expect(picker.selected()).toEqual([{ id: 'one', name: 'One' }]);
    http.expectNone((req) => req.url === '/api/cocktails');
  });
});
