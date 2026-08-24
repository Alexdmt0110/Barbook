import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
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
    const cocktails = [
      {
        id: 'cocktail-1',
        slug: 'daiquiri',
        name: 'Daiquiri',
        type: 'CLASSIC' as const,
        family: 'Sour',
        method: 'SHAKER' as const,
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
});
