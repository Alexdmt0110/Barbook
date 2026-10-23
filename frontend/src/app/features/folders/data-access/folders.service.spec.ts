import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FoldersService } from './folders.service';

describe('FoldersService HTTP serialization', () => {
  let service: FoldersService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FoldersService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends the paginated search and preserves the version of metadata commands', () => {
    service.browse({ search: '  Soirée  ', page: 2, pageSize: 25 }).subscribe();
    const browse = http.expectOne((req) => req.url === '/api/folders/browse');
    expect(browse.request.params.get('search')).toBe('Soirée');
    expect(browse.request.params.get('page')).toBe('2');
    expect(browse.request.params.get('pageSize')).toBe('25');
    browse.flush({ items: [], total: 0, page: 2, pageSize: 25, totalPages: 0 });
    service.rename('a', 'Nouveau', 3).subscribe();
    const rename = http.expectOne('/api/folders/a');
    expect(rename.request.method).toBe('PATCH');
    expect(rename.request.body).toEqual({ name: 'Nouveau', expectedVersion: 3 });
    rename.flush({ id: 'a', name: 'Nouveau', version: 4, cocktailCount: 0 });
    service.remove('a', 4, 'observed-token').subscribe();
    const remove = http.expectOne(
      '/api/folders/a?expectedVersion=4&expectedMembershipToken=observed-token',
    );
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ deleted: true });
  });
  it('creates an empty folder independently of recipes', () => {
    service
      .create('Créations')
      .subscribe((folder) => expect(folder).toEqual({ id: 'a', name: 'Créations' }));
    const request = http.expectOne('/api/folders');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Créations' });
    request.flush({ id: 'a', name: 'Créations' });
  });
  it('sends local memberships without a recipe or tag replacement payload', () => {
    const expectedVersions = [
      { cocktailId: 'one', expectedVersion: 3 },
      { cocktailId: 'two', expectedVersion: 7 },
    ];
    service.addCocktails('a', expectedVersions).subscribe();
    const add = http.expectOne('/api/folders/a/cocktails');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ cocktailIds: ['one', 'two'], expectedVersions });
    add.flush({ added: 2 });
    service.removeCocktail('a', 'one', 4).subscribe();
    const remove = http.expectOne('/api/folders/a/cocktails/one?expectedVersion=4');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ removed: 1 });
  });
});
