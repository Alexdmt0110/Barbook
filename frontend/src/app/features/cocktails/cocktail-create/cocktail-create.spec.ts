import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { IngredientsService } from '../../ingredients/data-access/ingredients.service';
import { CreateCocktailRequest } from '../data-access/cocktail.models';
import { CocktailsService } from '../data-access/cocktails.service';
import { CocktailCreate } from './cocktail-create';

class CocktailsServiceStub {
  readonly requests: CreateCocktailRequest[] = [];

  response: Observable<{
    id: string;
    slug: string;
  }> = of({
    id: 'cocktail-new',
    slug: 'tom-collins',
  });

  createPersonalCocktail(request: CreateCocktailRequest): Observable<{
    id: string;
    slug: string;
  }> {
    this.requests.push(request);

    return this.response;
  }
}

class IngredientsServiceStub {
  searchPersonalIngredients() {
    return of([]);
  }
}

describe('CocktailCreate', () => {
  let cocktailsService: CocktailsServiceStub;

  let router: Router;

  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocktailCreate],
      providers: [
        provideRouter([]),
        {
          provide: CocktailsService,
          useClass: CocktailsServiceStub,
        },
        {
          provide: IngredientsService,
          useClass: IngredientsServiceStub,
        },
      ],
    }).compileComponents();

    cocktailsService = TestBed.inject(CocktailsService) as unknown as CocktailsServiceStub;

    router = TestBed.inject(Router);

    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    navigateSpy.mockRestore();
  });

  function createComponent(): CocktailCreate {
    const fixture = TestBed.createComponent(CocktailCreate);

    return fixture.componentInstance;
  }

  function fillRequiredFields(component: CocktailCreate): void {
    component.form.controls.name.setValue('Tom Collins');

    component.form.controls.glass.setValue('Highball');

    component.steps.at(0).setValue('Shaker puis filtrer.');
  }

  it('converts centilitres to millilitres and persists TOP_UP without an amount', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin = component.ingredients.at(0);

    gin.controls.ingredientName.setValue('Gin');

    gin.controls.ingredientDefaultAbv.setValue(40);

    gin.controls.amount.setValue(5);

    gin.controls.unit.setValue('CL');

    component.addIngredient();

    const tonic = component.ingredients.at(1);

    tonic.controls.ingredientName.setValue('Tonic');

    tonic.controls.ingredientDefaultAbv.setValue(0);

    tonic.controls.unit.setValue('TOP_UP');

    component.onIngredientUnitChange(1);

    component.form.controls.mainAlcoholName.setValue('Gin');

    component.submit();

    expect(cocktailsService.requests).toHaveLength(1);

    const request = cocktailsService.requests[0];

    expect(request?.ingredients[0]).toMatchObject({
      ingredientName: 'Gin',
      ingredientDefaultAbv: 40,
      amount: 50,
      unit: 'ML',
    });

    expect(request?.ingredients[1]).toMatchObject({
      ingredientName: 'Tonic',
      ingredientDefaultAbv: 0,
      amount: null,
      unit: 'TOP_UP',
    });

    expect(request?.mainAlcoholName).toBe('Gin');
  });

  it('uses an ABV override when an existing catalogue ingredient is changed for the recipe', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const gin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    component.onIngredientSelected(0, gin);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.amount.setValue(5);

    ingredient.controls.ingredientDefaultAbv.setValue(47);

    component.submit();

    expect(cocktailsService.requests).toHaveLength(1);

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'Gin',
      ingredientDefaultAbv: 40,
      abvOverride: 47,
      amount: 50,
      unit: 'ML',
    });
  });

  it('uses the entered ABV as the catalogue value for a new ingredient', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Liqueur maison');

    ingredient.controls.ingredientDefaultAbv.setValue(18);

    ingredient.controls.amount.setValue(2);

    ingredient.controls.unit.setValue('CL');

    component.submit();

    expect(cocktailsService.requests[0]?.ingredients[0]).toMatchObject({
      ingredientName: 'Liqueur maison',
      ingredientDefaultAbv: 18,
      amount: 20,
      unit: 'ML',
    });

    expect(cocktailsService.requests[0]?.ingredients[0]?.abvOverride).toBeUndefined();
  });

  it('clears an invalid main alcohol when the ingredient stops being alcoholic', () => {
    const component = createComponent();

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    component.form.controls.mainAlcoholName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(0);

    component.syncMainAlcoholSelection();

    expect(component.form.controls.mainAlcoholName.value).toBe('');
  });

  it('navigates to the created cocktail detail page', () => {
    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    ingredient.controls.amount.setValue(5);

    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/cocktails', 'tom-collins']);
  });

  it('shows a useful conflict message for an existing cocktail name', () => {
    cocktailsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 409,
          statusText: 'Conflict',
        }),
    );

    const component = createComponent();

    fillRequiredFields(component);

    const ingredient = component.ingredients.at(0);

    ingredient.controls.ingredientName.setValue('Gin');

    ingredient.controls.ingredientDefaultAbv.setValue(40);

    ingredient.controls.amount.setValue(5);

    component.submit();

    expect(component.errorMessage()).toBe(
      'Un cocktail portant ce nom existe déjà dans ton Barbook.',
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not submit an invalid form', () => {
    const component = createComponent();

    component.submit();

    expect(cocktailsService.requests).toEqual([]);

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
