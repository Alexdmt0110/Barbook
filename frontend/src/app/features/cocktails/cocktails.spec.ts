import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  CocktailListQuery,
  CocktailListResult,
  CocktailSummary,
  CocktailSummaryFolder,
  CocktailSummaryTag,
} from './data-access/cocktail.models';
import { CocktailsService } from './data-access/cocktails.service';
import { Cocktails } from './cocktails';

class CocktailsServiceStub {
  readonly queries: CocktailListQuery[] = [];

  folderRequests = 0;

  tagRequests = 0;

  handler: (query: CocktailListQuery) => Observable<CocktailListResult> = () =>
    of({
      items: [],
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 0,
    });

  foldersResponse: Observable<CocktailSummaryFolder[]> = of([
    {
      id: 'folder-classics',
      name: 'Classiques',
    },
    {
      id: 'folder-favorites',
      name: 'Favoris',
    },
  ]);

  tagsResponse: Observable<CocktailSummaryTag[]> = of([
    {
      id: 'tag-bitter',
      name: 'Amer',
      slug: 'amer',
    },
    {
      id: 'tag-citrus',
      name: 'Agrumes',
      slug: 'agrumes',
    },
  ]);

  getPersonalCocktails(query: CocktailListQuery = {}): Observable<CocktailListResult> {
    this.queries.push({
      ...query,
    });

    return this.handler(query);
  }

  getPersonalFolders(): Observable<CocktailSummaryFolder[]> {
    this.folderRequests += 1;

    return this.foldersResponse;
  }

  getPersonalTags(): Observable<CocktailSummaryTag[]> {
    this.tagRequests += 1;

    return this.tagsResponse;
  }
}

describe('Cocktails', () => {
  let cocktailsService: CocktailsServiceStub;

  const cocktails: CocktailSummary[] = [
    {
      id: 'cocktail-daiquiri',
      slug: 'daiquiri',
      name: 'Daiquiri',
      type: 'CLASSIC',
      family: 'Sour',
      method: 'SHAKER',
      glass: 'Coupe',
      imageUrl: null,
      mainAlcohol: {
        id: 'ingredient-rum',
        name: 'Rhum blanc',
      },
      folder: {
        id: 'folder-classics',
        name: 'Classiques',
      },
      tags: [
        {
          id: 'tag-classic',
          name: 'Classique',
          slug: 'classique',
        },
        {
          id: 'tag-citrus',
          name: 'Agrumes',
          slug: 'agrumes',
        },
      ],
      updatedAt: '2026-08-24T12:00:00.000Z',
    },
    {
      id: 'cocktail-negroni',
      slug: 'negroni',
      name: 'Negroni',
      type: 'CLASSIC',
      family: 'Spirit-forward',
      method: 'MIXING_GLASS',
      glass: 'Old fashioned',
      imageUrl: null,
      mainAlcohol: {
        id: 'ingredient-gin',
        name: 'Gin',
      },
      folder: {
        id: 'folder-favorites',
        name: 'Favoris',
      },
      tags: [
        {
          id: 'tag-bitter',
          name: 'Amer',
          slug: 'amer',
        },
      ],
      updatedAt: '2026-08-24T12:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cocktails],
      providers: [
        provideRouter([]),
        {
          provide: CocktailsService,
          useClass: CocktailsServiceStub,
        },
      ],
    }).compileComponents();

    cocktailsService = TestBed.inject(CocktailsService) as unknown as CocktailsServiceStub;
  });

  it('loads and renders cocktails and organization filter catalogs', () => {
    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const cards = compiled.querySelectorAll('.cocktail-card:not(.skeleton-card)');

    const links = compiled.querySelectorAll<HTMLAnchorElement>('.cocktail-card-link');

    const createLink = compiled.querySelector<HTMLAnchorElement>('.create-link');

    expect(cocktailsService.queries).toHaveLength(1);

    expect(cocktailsService.queries[0]).toEqual({
      search: undefined,
      type: undefined,
      method: undefined,
      folderId: undefined,
      tagId: undefined,
      page: 1,
      pageSize: 24,
    });

    expect(cocktailsService.folderRequests).toBe(1);

    expect(cocktailsService.tagRequests).toBe(1);

    expect(cards.length).toBe(2);

    expect(links.length).toBe(2);

    expect(links[0]?.getAttribute('href')).toBe('/cocktails/daiquiri');

    expect(createLink).not.toBeNull();

    expect(createLink?.getAttribute('href')).toBe('/cocktails/new');

    expect(compiled.textContent).toContain('Daiquiri');

    expect(compiled.textContent).toContain('Negroni');

    expect(compiled.textContent).toContain('2 cocktails');

    expect(compiled.textContent).toContain('Rhum blanc');

    expect(compiled.textContent).toContain('Verre à mélange');

    expect(compiled.textContent).toContain('Nouveau cocktail');

    expect(compiled.querySelector('#cocktail-search')).not.toBeNull();

    expect(compiled.querySelector('#cocktail-folder-filter')).not.toBeNull();

    expect(compiled.querySelector('#cocktail-tag-filter')).not.toBeNull();

    expect(compiled.textContent).toContain('Favoris');

    expect(compiled.textContent).toContain('Agrumes');
  });

  it('renders the empty state with a creation action when no cocktail exists', () => {
    cocktailsService.handler = () =>
      of({
        items: [],
        page: 1,
        pageSize: 24,
        total: 0,
        totalPages: 0,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const createLink = compiled.querySelector<HTMLAnchorElement>('.empty-create-link');

    expect(compiled.textContent).toContain('Bibliothèque vide');

    expect(compiled.textContent).toContain('Ton premier cocktail attend sa place.');

    expect(compiled.textContent).toContain(
      'Commence ton Barbook en enregistrant ta première recette.',
    );

    expect(compiled.textContent).toContain('0 cocktail');

    expect(compiled.querySelector('.library-tools')).toBeNull();

    expect(createLink).not.toBeNull();

    expect(createLink?.getAttribute('href')).toBe('/cocktails/new');
  });

  it('debounces the cocktail name search', async () => {
    cocktailsService.handler = (query) => {
      if (query.search === 'neg') {
        return of({
          items: [cocktails[1]],
          page: 1,
          pageSize: 24,
          total: 1,
          totalPages: 1,
        });
      }

      return of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });
    };

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#cocktail-search') as HTMLInputElement;

    input.value = 'neg';

    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(cocktailsService.queries).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 350));

    fixture.detectChanges();

    expect(cocktailsService.queries).toHaveLength(2);

    expect(cocktailsService.queries[1]).toMatchObject({
      search: 'neg',
      page: 1,
      pageSize: 24,
    });

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Negroni');

    expect(compiled.textContent).not.toContain('Daiquiri');
  });

  it('applies type and method filters immediately', () => {
    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const typeSelect = fixture.nativeElement.querySelector(
      '#cocktail-type-filter',
    ) as HTMLSelectElement;

    typeSelect.value = 'CLASSIC';

    typeSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(cocktailsService.queries[1]).toMatchObject({
      type: 'CLASSIC',
      page: 1,
    });

    const methodSelect = fixture.nativeElement.querySelector(
      '#cocktail-method-filter',
    ) as HTMLSelectElement;

    methodSelect.value = 'MIXING_GLASS';

    methodSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(cocktailsService.queries[2]).toMatchObject({
      type: 'CLASSIC',
      method: 'MIXING_GLASS',
      page: 1,
    });
  });

  it('applies folder and tag filters immediately', () => {
    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const folderSelect = fixture.nativeElement.querySelector(
      '#cocktail-folder-filter',
    ) as HTMLSelectElement;

    folderSelect.value = 'folder-favorites';

    folderSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(cocktailsService.queries[1]).toMatchObject({
      folderId: 'folder-favorites',
      tagId: undefined,
      page: 1,
    });

    const tagSelect = fixture.nativeElement.querySelector(
      '#cocktail-tag-filter',
    ) as HTMLSelectElement;

    tagSelect.value = 'tag-bitter';

    tagSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(cocktailsService.queries[2]).toMatchObject({
      folderId: 'folder-favorites',
      tagId: 'tag-bitter',
      page: 1,
    });
  });

  it('clears organization filters with the other filters', () => {
    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const folderSelect = fixture.nativeElement.querySelector(
      '#cocktail-folder-filter',
    ) as HTMLSelectElement;

    folderSelect.value = 'folder-favorites';

    folderSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    const resetButton = fixture.nativeElement.querySelector('.clear-filters') as HTMLButtonElement;

    resetButton.click();

    fixture.detectChanges();

    const lastQuery = cocktailsService.queries.at(-1);

    expect(lastQuery).toEqual({
      search: undefined,
      type: undefined,
      method: undefined,
      folderId: undefined,
      tagId: undefined,
      page: 1,
      pageSize: 24,
    });

    expect(fixture.componentInstance.selectedFolderId()).toBe('');

    expect(fixture.componentInstance.selectedTagId()).toBe('');
  });

  it('keeps the cocktail library usable when organization catalogs fail', () => {
    cocktailsService.foldersResponse = throwError(
      () =>
        new HttpErrorResponse({
          status: 0,
          statusText: 'Unknown Error',
        }),
    );

    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Daiquiri');

    expect(compiled.textContent).toContain('Dossiers indisponibles');

    expect(compiled.textContent).toContain('Tags indisponibles');

    expect(compiled.textContent).toContain('Réessayer dossiers / tags');

    const folderSelect = compiled.querySelector('#cocktail-folder-filter') as HTMLSelectElement;

    const tagSelect = compiled.querySelector('#cocktail-tag-filter') as HTMLSelectElement;

    expect(folderSelect.disabled).toBe(true);

    expect(tagSelect.disabled).toBe(true);
  });

  it('renders a dedicated empty result state when filters match nothing', () => {
    cocktailsService.handler = (query) => {
      if (query.type) {
        return of({
          items: [],
          page: 1,
          pageSize: 24,
          total: 0,
          totalPages: 0,
        });
      }

      return of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });
    };

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const typeSelect = fixture.nativeElement.querySelector(
      '#cocktail-type-filter',
    ) as HTMLSelectElement;

    typeSelect.value = 'VARIATION';

    typeSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Aucun résultat');

    expect(compiled.textContent).toContain('Aucun cocktail ne correspond à ta recherche.');

    expect(compiled.querySelector('.library-tools')).not.toBeNull();
  });

  it('moves to the next page and keeps organization filters in the request', () => {
    cocktailsService.handler = (query) =>
      of({
        items: cocktails,
        page: query.page ?? 1,
        pageSize: 24,
        total: 30,
        totalPages: 2,
      });

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const folderSelect = fixture.nativeElement.querySelector(
      '#cocktail-folder-filter',
    ) as HTMLSelectElement;

    folderSelect.value = 'folder-favorites';

    folderSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    const tagSelect = fixture.nativeElement.querySelector(
      '#cocktail-tag-filter',
    ) as HTMLSelectElement;

    tagSelect.value = 'tag-bitter';

    tagSelect.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    const nextButton = fixture.nativeElement.querySelector('.pagination-next') as HTMLButtonElement;

    expect(nextButton).not.toBeNull();

    nextButton.click();

    fixture.detectChanges();

    expect(cocktailsService.queries).toHaveLength(4);

    expect(cocktailsService.queries[3]).toMatchObject({
      folderId: 'folder-favorites',
      tagId: 'tag-bitter',
      page: 2,
      pageSize: 24,
    });

    const paginationLabel = fixture.nativeElement.querySelector(
      '.pagination p',
    ) as HTMLParagraphElement | null;

    expect(paginationLabel).not.toBeNull();

    expect(paginationLabel?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Page 2 sur 2');
  });

  it('renders a connection error when the API is unreachable', () => {
    cocktailsService.handler = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 0,
            statusText: 'Unknown Error',
          }),
      );

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Chargement impossible');

    expect(compiled.textContent).toContain('Impossible de joindre Barbook.');

    expect(compiled.querySelector('.error-state button')).not.toBeNull();
  });

  it('retries loading cocktails after an error', () => {
    cocktailsService.handler = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            statusText: 'Internal Server Error',
          }),
      );

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    expect(cocktailsService.queries).toHaveLength(1);

    cocktailsService.handler = () =>
      of({
        items: cocktails,
        page: 1,
        pageSize: 24,
        total: 2,
        totalPages: 1,
      });

    const retryButton = fixture.nativeElement.querySelector(
      '.error-state button',
    ) as HTMLButtonElement;

    retryButton.click();

    fixture.detectChanges();

    expect(cocktailsService.queries).toHaveLength(2);

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Daiquiri');

    expect(compiled.textContent).toContain('Negroni');

    expect(compiled.textContent).not.toContain('Chargement impossible');
  });
});
