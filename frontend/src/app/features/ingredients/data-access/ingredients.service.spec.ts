import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IngredientSuggestion } from './ingredient.models';
import { IngredientsService } from './ingredients.service';

describe('IngredientsService', () => {
  let service: IngredientsService;

  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(IngredientsService);

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('searches personal ingredients with an encoded query', () => {
    const suggestions: IngredientSuggestion[] = [
      {
        id: 'lemon',
        name: 'Jus de citron jaune',
        slug: 'jus-de-citron-jaune',
        defaultAbv: 0,
      },
      {
        id: 'lime',
        name: 'Jus de citron vert',
        slug: 'jus-de-citron-vert',
        defaultAbv: 0,
      },
    ];

    service.searchPersonalIngredients('jus de citron').subscribe((result) => {
      expect(result).toEqual(suggestions);
    });

    const request = httpTestingController.expectOne('/api/ingredients?query=jus%20de%20citron');

    expect(request.request.method).toBe('GET');

    request.flush(suggestions);
  });
});
