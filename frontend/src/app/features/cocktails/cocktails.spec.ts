import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { CocktailSummary } from './data-access/cocktail.models';
import { CocktailsService } from './data-access/cocktails.service';
import { Cocktails } from './cocktails';

class CocktailsServiceStub {
  response: Observable<CocktailSummary[]> = of([]);

  callCount = 0;

  getPersonalCocktails(): Observable<CocktailSummary[]> {
    this.callCount += 1;

    return this.response;
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
      folder: null,
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
      folder: null,
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

  it('loads and renders cocktails', () => {
    cocktailsService.response = of(cocktails);

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const cards = compiled.querySelectorAll('.cocktail-card:not(.skeleton-card)');

    const links = compiled.querySelectorAll<HTMLAnchorElement>('.cocktail-card-link');

    const createLink = compiled.querySelector<HTMLAnchorElement>('.create-link');

    expect(cocktailsService.callCount).toBe(1);

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
  });

  it('renders the empty state with a creation action when no cocktail exists', () => {
    cocktailsService.response = of([]);

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

    expect(createLink).not.toBeNull();

    expect(createLink?.getAttribute('href')).toBe('/cocktails/new');

    expect(createLink?.textContent).toContain('Créer mon premier cocktail');
  });

  it('renders a connection error when the API is unreachable', () => {
    cocktailsService.response = throwError(
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
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
        }),
    );

    const fixture = TestBed.createComponent(Cocktails);

    fixture.detectChanges();

    expect(cocktailsService.callCount).toBe(1);

    cocktailsService.response = of(cocktails);

    const retryButton = fixture.nativeElement.querySelector(
      '.error-state button',
    ) as HTMLButtonElement;

    retryButton.click();
    fixture.detectChanges();

    expect(cocktailsService.callCount).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Daiquiri');

    expect(compiled.textContent).toContain('Negroni');

    expect(compiled.textContent).not.toContain('Chargement impossible');
  });
});
