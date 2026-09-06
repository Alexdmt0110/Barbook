import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  CocktailDetail,
  CocktailListResult,
  CocktailSummary,
  CreateCocktailRequest,
} from './cocktail.models';
import { CocktailsService } from './cocktails.service';

describe('CocktailsService', () => {
  let service: CocktailsService;

  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CocktailsService);

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads the authenticated user personal cocktails', () => {
    const cocktails: CocktailSummary[] = [
      {
        id: 'cocktail-1',
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
        folder: null,
        tags: [
          {
            id: 'tag-classic',
            name: 'Classique',
            slug: 'classique',
          },
        ],
        updatedAt: '2026-08-24T12:00:00.000Z',
      },
    ];

    const response: CocktailListResult = {
      items: cocktails,
      page: 1,
      pageSize: 24,
      total: 1,
      totalPages: 1,
    };

    service.getPersonalCocktails().subscribe((result) => {
      expect(result).toEqual(response);
    });

    const request = httpTestingController.expectOne('/api/cocktails');

    expect(request.request.method).toBe('GET');

    expect(request.request.params.keys()).toEqual([]);

    request.flush(response);
  });

  it('sends search filters and pagination as query parameters', () => {
    service
      .getPersonalCocktails({
        search: '  negroni  ',
        type: 'CLASSIC',
        method: 'MIXING_GLASS',
        page: 2,
        pageSize: 24,
      })
      .subscribe();

    const request = httpTestingController.expectOne(
      (candidate) => candidate.url === '/api/cocktails',
    );

    expect(request.request.method).toBe('GET');

    expect(request.request.params.get('search')).toBe('negroni');

    expect(request.request.params.get('type')).toBe('CLASSIC');

    expect(request.request.params.get('method')).toBe('MIXING_GLASS');

    expect(request.request.params.get('page')).toBe('2');

    expect(request.request.params.get('pageSize')).toBe('24');

    request.flush({
      items: [],
      page: 2,
      pageSize: 24,
      total: 30,
      totalPages: 2,
    });
  });

  it('omits a blank search parameter', () => {
    service
      .getPersonalCocktails({
        search: '   ',
        page: 1,
        pageSize: 24,
      })
      .subscribe();

    const request = httpTestingController.expectOne('/api/cocktails?page=1&pageSize=24');

    expect(request.request.params.has('search')).toBe(false);

    request.flush({
      items: [],
      page: 1,
      pageSize: 24,
      total: 0,
      totalPages: 0,
    });
  });

  it('loads one personal cocktail by slug', () => {
    const cocktail: CocktailDetail = {
      id: 'cocktail-1',
      slug: 'daiquiri',
      name: 'Daiquiri',
      type: 'CLASSIC',
      family: 'Sour',
      method: 'SHAKER',
      glass: 'Coupe',
      ice: null,
      notes: null,
      imageUrl: null,
      mainAlcohol: {
        id: 'ingredient-rum',
        name: 'Rhum blanc',
      },
      folder: null,
      tags: [],
      ingredients: [],
      garnishes: [],
      steps: [],
      estimatedAbv: 22.22,
      updatedAt: '2026-08-24T12:00:00.000Z',
    };

    service.getPersonalCocktail('daiquiri').subscribe((result) => {
      expect(result).toEqual(cocktail);
    });

    const request = httpTestingController.expectOne('/api/cocktails/daiquiri');

    expect(request.request.method).toBe('GET');

    expect(request.request.params.keys()).toEqual([]);

    request.flush(cocktail);
  });

  it('encodes the cocktail slug before building the request URL', () => {
    service.getPersonalCocktail('création spéciale').subscribe();

    const request = httpTestingController.expectOne('/api/cocktails/cr%C3%A9ation%20sp%C3%A9ciale');

    expect(request.request.method).toBe('GET');

    request.flush({});
  });

  it('creates a personal cocktail', () => {
    const payload: CreateCocktailRequest = {
      name: 'Tom Collins',
      type: 'CLASSIC',
      family: 'Collins',
      method: 'SHAKER',
      glass: 'Highball',
      ice: 'Glaçons',
      mainAlcoholName: 'Gin',
      ingredients: [
        {
          ingredientName: 'Gin',
          ingredientDefaultAbv: 40,
          amount: 50,
          unit: 'ML',
        },
        {
          ingredientName: 'Eau gazeuse',
          ingredientDefaultAbv: 0,
          amount: null,
          unit: 'TOP_UP',
        },
      ],
      steps: ['Shaker.', 'Compléter avec l’eau gazeuse.'],
    };

    service.createPersonalCocktail(payload).subscribe((result) => {
      expect(result).toEqual({
        id: 'cocktail-new',
        slug: 'tom-collins',
      });
    });

    const request = httpTestingController.expectOne('/api/cocktails');

    expect(request.request.method).toBe('POST');

    expect(request.request.body).toEqual(payload);

    request.flush({
      id: 'cocktail-new',
      slug: 'tom-collins',
    });
  });
});
