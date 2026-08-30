import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { UiAutocompleteOption } from '../../../shared/ui/autocomplete/autocomplete';
import { IngredientSuggestion } from '../data-access/ingredient.models';
import { IngredientsService } from '../data-access/ingredients.service';
import { IngredientAutocomplete } from './ingredient-autocomplete';

class IngredientsServiceStub {
  readonly queries: string[] = [];

  response: Observable<IngredientSuggestion[]> = of([]);

  searchPersonalIngredients(query: string): Observable<IngredientSuggestion[]> {
    this.queries.push(query);

    return this.response;
  }
}

describe('IngredientAutocomplete', () => {
  let ingredientsService: IngredientsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientAutocomplete],
      providers: [
        {
          provide: IngredientsService,
          useClass: IngredientsServiceStub,
        },
      ],
    }).compileComponents();

    ingredientsService = TestBed.inject(IngredientsService) as unknown as IngredientsServiceStub;
  });

  it('does not call the API before three characters', async () => {
    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.handleQueryChange('ju');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(ingredientsService.queries).toEqual([]);
  });

  it('debounces a search with three or more characters', async () => {
    ingredientsService.response = of([
      {
        id: 'lemon',
        name: 'Jus de citron jaune',
        slug: 'jus-de-citron-jaune',
        defaultAbv: 0,
      },
    ]);

    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.handleQueryChange('jus');

    expect(ingredientsService.queries).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(ingredientsService.queries).toEqual(['jus']);

    expect(component.suggestions()).toHaveLength(1);
  });

  it('cancels a pending search when the query becomes too short', async () => {
    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.handleQueryChange('citron');

    component.handleQueryChange('ci');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(ingredientsService.queries).toEqual([]);

    expect(component.suggestions()).toEqual([]);
  });

  it('exposes useful alcohol descriptions', () => {
    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.suggestions.set([
      {
        id: 'unknown',
        name: 'Ingrédient inconnu',
        slug: 'ingredient-inconnu',
        defaultAbv: null,
      },
      {
        id: 'lemon',
        name: 'Jus de citron jaune',
        slug: 'jus-de-citron-jaune',
        defaultAbv: 0,
      },
      {
        id: 'gin',
        name: 'Gin',
        slug: 'gin',
        defaultAbv: 40,
      },
    ]);

    expect(component.options()).toEqual([
      {
        id: 'unknown',
        label: 'Ingrédient inconnu',
        description: 'Degré inconnu',
      },
      {
        id: 'lemon',
        label: 'Jus de citron jaune',
        description: 'Sans alcool',
      },
      {
        id: 'gin',
        label: 'Gin',
        description: '40 % vol.',
      },
    ]);
  });

  it('emits the canonical ingredient when a suggestion is selected', () => {
    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    const ingredient: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    component.suggestions.set([ingredient]);

    let selected: IngredientSuggestion | null = null;

    component.ingredientSelected.subscribe((value) => {
      selected = value;
    });

    const option: UiAutocompleteOption = {
      id: 'gin',
      label: 'Gin',
      description: '40 % vol.',
    };

    component.handleOptionSelected(option);

    expect(selected).toEqual(ingredient);

    expect(component.suggestions()).toEqual([]);
  });

  it('keeps free text as a valid control value', () => {
    const fixture = TestBed.createComponent(IngredientAutocomplete);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    let controlValue = '';

    component.registerOnChange((value) => {
      controlValue = value;
    });

    component.handleValueChange('Purée de kumquat');

    expect(component.value()).toBe('Purée de kumquat');

    expect(controlValue).toBe('Purée de kumquat');
  });
});
