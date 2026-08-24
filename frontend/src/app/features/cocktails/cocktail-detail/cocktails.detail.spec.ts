import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { CocktailDetail as CocktailDetailModel } from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';
import { CocktailDetail } from './cocktail-detail';

class CocktailsServiceStub {
  response: Observable<CocktailDetailModel> = of(buildCocktail());

  requestedSlugs: string[] = [];

  getPersonalCocktail(slug: string): Observable<CocktailDetailModel> {
    this.requestedSlugs.push(slug);

    return this.response;
  }
}

function buildCocktail(): CocktailDetailModel {
  return {
    id: 'cocktail-daiquiri',
    slug: 'daiquiri',
    name: 'Daiquiri',
    type: 'CLASSIC',
    family: 'Sour',
    method: 'SHAKER',
    glass: 'Coupe',
    ice: null,
    notes: 'Servir bien frais.',
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
    ingredients: [
      {
        id: 'recipe-rum',
        ingredient: {
          id: 'ingredient-rum',
          name: 'Rhum blanc',
          slug: 'rhum-blanc',
        },
        amount: 50,
        unit: 'ML',
        specification: null,
        abv: 40,
        notes: null,
      },
      {
        id: 'recipe-lime',
        ingredient: {
          id: 'ingredient-lime',
          name: 'Jus de citron vert',
          slug: 'jus-citron-vert',
        },
        amount: 25,
        unit: 'ML',
        specification: null,
        abv: 0,
        notes: null,
      },
    ],
    garnishes: [
      {
        id: 'garnish-lime',
        ingredient: {
          id: 'ingredient-fruit',
          name: 'Citron vert',
          slug: 'citron-vert',
        },
        amount: 1,
        unit: 'PIECE',
        specification: null,
        usage: 'Fine rondelle de citron vert.',
      },
    ],
    steps: [
      {
        id: 'step-1',
        content: 'Verser les ingrédients dans un shaker.',
      },
      {
        id: 'step-2',
        content: 'Shaker puis filtrer.',
      },
    ],
    estimatedAbv: 22.22,
    updatedAt: '2026-08-24T12:00:00.000Z',
  };
}

describe('CocktailDetail', () => {
  let cocktailsService: CocktailsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocktailDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                slug: 'daiquiri',
              }),
            },
          },
        },
        {
          provide: CocktailsService,
          useClass: CocktailsServiceStub,
        },
      ],
    }).compileComponents();

    cocktailsService = TestBed.inject(CocktailsService) as unknown as CocktailsServiceStub;
  });

  it('loads and renders the cocktail detail', () => {
    cocktailsService.response = of(buildCocktail());

    const fixture = TestBed.createComponent(CocktailDetail);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(cocktailsService.requestedSlugs).toEqual(['daiquiri']);

    expect(compiled.textContent).toContain('Daiquiri');

    expect(compiled.textContent).toContain('Rhum blanc');

    expect(compiled.textContent).toContain('5 cl');

    expect(compiled.textContent).toContain('2,5 cl');

    expect(compiled.textContent).toContain('~22,22 % vol.');

    expect(compiled.textContent).toContain('Verser les ingrédients dans un shaker.');

    expect(compiled.textContent).toContain('Fine rondelle de citron vert.');
  });

  it('formats canonical millilitres as centilitres', () => {
    const fixture = TestBed.createComponent(CocktailDetail);

    const component = fixture.componentInstance;

    expect(component.formatMeasurement(45, 'ML')).toBe('4,5 cl');

    expect(component.formatMeasurement(22.5, 'ML')).toBe('2,25 cl');

    expect(component.formatMeasurement(5, 'ML')).toBe('0,5 cl');
  });

  it('formats structured measurement units', () => {
    const fixture = TestBed.createComponent(CocktailDetail);

    const component = fixture.componentInstance;

    expect(component.formatMeasurement(3, 'PIECE')).toBe('3 pièces');

    expect(component.formatMeasurement(1, 'LEAF')).toBe('1 feuille');

    expect(component.formatMeasurement(2, 'DASH')).toBe('2 traits');

    expect(component.formatMeasurement(null, 'TOP_UP')).toBe('Compléter');

    expect(component.formatMeasurement(null, null)).toBe('Selon besoin');
  });

  it('formats estimated alcohol level', () => {
    const fixture = TestBed.createComponent(CocktailDetail);

    const component = fixture.componentInstance;

    expect(component.estimatedAbvLabel(22.22)).toBe('~22,22 % vol.');

    expect(component.estimatedAbvLabel(null)).toBe('Non estimé');
  });

  it('renders the not found state for a 404 response', () => {
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 404,
          statusText: 'Not Found',
        }),
    );

    const fixture = TestBed.createComponent(CocktailDetail);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Cocktail introuvable');

    expect(compiled.textContent).toContain('Cette recette n’existe pas dans ton Barbook.');
  });

  it('renders a connection error when the API is unreachable', () => {
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 0,
          statusText: 'Unknown Error',
        }),
    );

    const fixture = TestBed.createComponent(CocktailDetail);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Chargement impossible');

    expect(compiled.textContent).toContain('Impossible de joindre Barbook.');

    expect(compiled.querySelector('.state-action')).not.toBeNull();
  });

  it('retries loading after an API error', () => {
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
        }),
    );

    const fixture = TestBed.createComponent(CocktailDetail);

    fixture.detectChanges();

    expect(cocktailsService.requestedSlugs).toEqual(['daiquiri']);

    cocktailsService.response = of(buildCocktail());

    const retryButton = fixture.nativeElement.querySelector('.state-action') as HTMLButtonElement;

    retryButton.click();
    fixture.detectChanges();

    expect(cocktailsService.requestedSlugs).toEqual(['daiquiri', 'daiquiri']);

    expect(fixture.nativeElement.textContent).toContain('Daiquiri');

    expect(fixture.nativeElement.textContent).not.toContain('Chargement impossible');
  });
});
