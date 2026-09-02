import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CocktailDetail, CocktailSummary, CreateCocktailRequest } from './cocktail.models';
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

    service.getPersonalCocktails().subscribe((result) => {
      expect(result).toEqual(cocktails);
    });

    const request = httpTestingController.expectOne('/api/cocktails');

    expect(request.request.method).toBe('GET');

    expect(request.request.params.keys()).toEqual([]);

    request.flush(cocktails);
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
