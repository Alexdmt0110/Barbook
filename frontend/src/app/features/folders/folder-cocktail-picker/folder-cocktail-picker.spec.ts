import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CocktailSummary } from '../../cocktails/data-access/cocktail.models';
import { FolderCocktailPicker } from './folder-cocktail-picker';

function recipe(id: string, assigned = false): CocktailSummary {
  return {
    id,
    slug: id,
    name: id,
    type: 'CLASSIC',
    family: null,
    method: 'SHAKER',
    glass: 'Coupe',
    imageUrl: null,
    mainAlcohol: null,
    folder: null,
    folders: assigned ? [{ id: 'folder', name: 'Folder' }] : [],
    tags: [],
    updatedAt: '2026-10-19T00:00:00Z',
  };
}
const result = (items: CocktailSummary[], page = 1, totalPages = 2) => ({
  items,
  page,
  pageSize: 12,
  total: 13,
  totalPages,
});

describe('FolderCocktailPicker', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FolderCocktailPicker],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function setup() {
    const fixture = TestBed.createComponent(FolderCocktailPicker);
    fixture.componentRef.setInput('folderId', 'folder');
    fixture.detectChanges();
    http
      .expectOne((req) => req.url === '/api/cocktails')
      .flush(result([recipe('one'), recipe('already', true)]));
    fixture.detectChanges();
    return fixture;
  }
  function checkbox(root: HTMLElement, name: string) {
    return [...root.querySelectorAll('label')]
      .find((label) => label.textContent?.trim() === name)
      ?.querySelector('input') as HTMLInputElement;
  }
  it('selects across pages and search, disables existing links and sends only the chosen IDs', () => {
    const fixture = setup();
    expect(
      (fixture.nativeElement.querySelectorAll('input[type=checkbox]')[1] as HTMLInputElement)
        .disabled,
    ).toBe(true);
    checkbox(fixture.nativeElement, 'one').click();
    fixture.componentInstance.load(2);
    const page2 = http.expectOne((req) => req.url === '/api/cocktails');
    expect(page2.request.params.get('page')).toBe('2');
    page2.flush(result([recipe('two')], 2));
    fixture.detectChanges();
    checkbox(fixture.nativeElement, 'two').click();
    fixture.componentInstance.searchTerm.set('one');
    fixture.componentInstance.search();
    const searched = http.expectOne((req) => req.url === '/api/cocktails');
    expect(searched.request.params.get('search')).toBe('one');
    searched.flush(result([recipe('one')], 1, 1));
    fixture.detectChanges();
    expect(fixture.componentInstance.selected().map((item) => item.id)).toEqual(['one', 'two']);
    expect(checkbox(fixture.nativeElement, 'one').checked).toBe(true);
    fixture.componentInstance.add();
    const add = http.expectOne('/api/folders/folder/cocktails');
    expect(add.request.body).toEqual({ cocktailIds: ['one', 'two'] });
    add.flush({ added: 2 });
    expect(fixture.componentInstance.selected()).toEqual([]);
  });
  it('retains every selection after an ambiguous network failure so an idempotent retry is possible', () => {
    const fixture = setup();
    checkbox(fixture.nativeElement, 'one').click();
    const busy: boolean[] = [];
    fixture.componentInstance.busyChanged.subscribe((value) => busy.push(value));
    fixture.componentInstance.add();
    http.expectOne('/api/folders/folder/cocktails').error(new ProgressEvent('error'));
    expect(fixture.componentInstance.selected().map((item) => item.id)).toEqual(['one']);
    fixture.componentInstance.add();
    http.expectOne('/api/folders/folder/cocktails').flush({ added: 0 });
    expect(fixture.componentInstance.selected()).toEqual([]);
    expect(busy).toEqual([true, false, true, false]);
  });
  it('reconciles an item already added elsewhere without discarding selections on other pages', () => {
    const fixture = setup();
    fixture.componentInstance.selected.set([
      { id: 'one', name: 'one' },
      { id: 'off-page', name: 'Other' },
    ]);
    fixture.componentRef.setInput('refreshKey', 1);
    fixture.detectChanges();
    http.expectOne((req) => req.url === '/api/cocktails').flush(result([recipe('one', true)]));
    expect(fixture.componentInstance.selected().map((item) => item.id)).toEqual(['off-page']);
  });
  it('enforces the explicit 100-item command limit without sending a partial batch', () => {
    const fixture = setup();
    fixture.componentInstance.selected.set(
      Array.from({ length: 100 }, (_, i) => ({ id: `selected-${i}`, name: `Item${i}` })),
    );
    checkbox(fixture.nativeElement, 'one').click();
    expect(fixture.componentInstance.selected()).toHaveLength(100);
    expect(checkbox(fixture.nativeElement, 'one').checked).toBe(false);
    expect(fixture.componentInstance.actionError()).toContain('au plus 100');
    http.expectNone('/api/folders/folder/cocktails');
  });
  it('returns from an emptied last page while keeping off-page selections', () => {
    const fixture = setup();
    checkbox(fixture.nativeElement, 'one').click();
    fixture.componentInstance.load(2);
    http.expectOne((req) => req.url === '/api/cocktails').flush({ ...result([], 2, 1), total: 1 });
    const current = http.expectOne((req) => req.url === '/api/cocktails');
    expect(current.request.params.get('page')).toBe('1');
    current.flush({ ...result([recipe('one')], 1, 1), total: 1 });
    expect(fixture.componentInstance.selected().map((item) => item.id)).toEqual(['one']);
  });
});
