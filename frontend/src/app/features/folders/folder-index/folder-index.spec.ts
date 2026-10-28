import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FolderIndex } from './folder-index';

describe('FolderIndex', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FolderIndex],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const page = { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  function setup() {
    const fixture = TestBed.createComponent(FolderIndex);
    fixture.detectChanges();
    http.expectOne((req) => req.url === '/api/folders/browse').flush(page);
    fixture.detectChanges();
    return fixture;
  }
  it('creates from the empty catalogue without needing a recipe', () => {
    const fixture = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(fixture.nativeElement.textContent).toContain('Aucun dossier à afficher');
    fixture.componentInstance.newName.set('  Soirée  ');
    fixture.componentInstance.create();
    const request = http.expectOne('/api/folders');
    expect(request.request.body).toEqual({ name: 'Soirée' });
    request.flush({ id: 'new', name: 'Soirée' });
    expect(navigate).toHaveBeenCalledWith(['/folders', 'new']);
  });
  it('keeps the new name on conflict or network failure', () => {
    const fixture = setup();
    fixture.componentInstance.newName.set('Draft');
    fixture.componentInstance.create();
    http.expectOne('/api/folders').flush({}, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.componentInstance.newName()).toBe('Draft');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'saisie est conservée',
    );
  });
  it('cancels an obsolete page and applies explicit search from page one', () => {
    const fixture = setup();
    fixture.componentInstance.load(2);
    const old = http.expectOne((req) => req.url === '/api/folders/browse');
    fixture.componentInstance.searchTerm.set('  Soirée  ');
    fixture.componentInstance.search();
    expect(old.cancelled).toBe(true);
    const current = http.expectOne((req) => req.url === '/api/folders/browse');
    expect(current.request.params.get('search')).toBe('Soirée');
    expect(current.request.params.get('page')).toBe('1');
    current.flush({
      ...page,
      total: 1,
      totalPages: 1,
      items: [{ id: 'a', name: 'Soirée', version: 0, cocktailCount: 3 }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.folder-card').textContent).toContain(
      '3 cocktail(s)',
    );
  });
  it('returns to a reachable page when concurrent deletions shrink the catalogue', () => {
    const fixture = setup();
    fixture.componentInstance.load(2);
    http
      .expectOne((req) => req.url === '/api/folders/browse')
      .flush({ ...page, page: 2, total: 1, totalPages: 1 });
    const current = http.expectOne((req) => req.url === '/api/folders/browse');
    expect(current.request.params.get('page')).toBe('1');
    current.flush({
      ...page,
      total: 1,
      totalPages: 1,
      items: [{ id: 'a', name: 'Kept', version: 0, cocktailCount: 0 }],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Kept');
  });
});
