import { IngredientSuggestion } from '../../ingredients/data-access/ingredient.models';
import { CocktailCreateFormValue, IngredientFormValue } from './cocktail-create.form';
import {
  buildCreateCocktailRequest,
  getAlcoholicIngredientOptions,
  hasAlcoholicIngredient,
} from './cocktail-create.mapper';

function createIngredient(overrides: Partial<IngredientFormValue> = {}): IngredientFormValue {
  return {
    ingredientName: 'Gin',
    ingredientDefaultAbv: 40,
    amount: 5,
    unit: 'CL',
    specification: '',
    notes: '',
    ...overrides,
  };
}

function createFormValue(): CocktailCreateFormValue {
  return {
    name: ' Tom Collins ',
    type: 'CLASSIC',
    family: ' Collins ',
    method: 'SHAKER',
    glass: ' Highball ',
    ice: ' Glaçons ',
    mainAlcoholName: 'Gin',
    notes: ' Très frais ',
    ingredients: [createIngredient()],
    garnishes: [],
    steps: [' Shaker puis filtrer. '],
  };
}

describe('cocktail creation request mapper', () => {
  it('normalizes text and converts centilitres to millilitres', () => {
    const request = buildCreateCocktailRequest(createFormValue(), []);

    expect(request).toMatchObject({
      name: 'Tom Collins',
      family: 'Collins',
      glass: 'Highball',
      ice: 'Glaçons',
      notes: 'Très frais',
      mainAlcoholName: 'Gin',
      steps: ['Shaker puis filtrer.'],
    });

    expect(request.ingredients[0]).toMatchObject({
      ingredientName: 'Gin',
      ingredientDefaultAbv: 40,
      amount: 50,
      unit: 'ML',
    });
  });

  it('persists TOP_UP without an amount', () => {
    const value = createFormValue();

    value.ingredients = [
      createIngredient({
        ingredientName: 'Tonic',
        ingredientDefaultAbv: 0,
        amount: null,
        unit: 'TOP_UP',
      }),
    ];

    value.mainAlcoholName = '';

    const request = buildCreateCocktailRequest(value, []);

    expect(request.ingredients[0]).toMatchObject({
      ingredientName: 'Tonic',
      amount: null,
      unit: 'TOP_UP',
    });
  });

  it('preserves catalogue ABV and creates an override when the recipe changes it', () => {
    const value = createFormValue();

    value.ingredients[0] = createIngredient({
      ingredientName: 'GIN',
      ingredientDefaultAbv: 47,
    });

    const selectedGin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    const request = buildCreateCocktailRequest(value, [selectedGin]);

    expect(request.ingredients[0]).toMatchObject({
      ingredientName: 'GIN',
      ingredientDefaultAbv: 40,
      abvOverride: 47,
    });
  });

  it('uses the entered ABV as the catalogue value when the ingredient is no longer the selected one', () => {
    const value = createFormValue();

    value.ingredients[0] = createIngredient({
      ingredientName: 'Vodka',
      ingredientDefaultAbv: 37.5,
    });

    const selectedGin: IngredientSuggestion = {
      id: 'gin',
      name: 'Gin',
      slug: 'gin',
      defaultAbv: 40,
    };

    const request = buildCreateCocktailRequest(value, [selectedGin]);

    expect(request.ingredients[0]).toMatchObject({
      ingredientName: 'Vodka',
      ingredientDefaultAbv: 37.5,
    });

    expect(request.ingredients[0]?.abvOverride).toBeUndefined();
  });

  it('recognizes the main alcohol by canonical slug', () => {
    expect(
      hasAlcoholicIngredient(
        [
          createIngredient({
            ingredientName: 'GIN',
          }),
        ],
        'Gin',
      ),
    ).toBe(true);
  });

  it('rejects an unknown or non-alcoholic main ingredient', () => {
    expect(
      hasAlcoholicIngredient(
        [
          createIngredient({
            ingredientName: 'Tonic',
            ingredientDefaultAbv: 0,
          }),
        ],
        'Tonic',
      ),
    ).toBe(false);

    expect(
      hasAlcoholicIngredient(
        [
          createIngredient({
            ingredientName: 'Sirop maison',
            ingredientDefaultAbv: null,
          }),
        ],
        'Sirop maison',
      ),
    ).toBe(false);
  });

  it('returns only named alcoholic ingredients as main alcohol options', () => {
    expect(
      getAlcoholicIngredientOptions([
        createIngredient({
          ingredientName: 'Gin',
          ingredientDefaultAbv: 40,
        }),
        createIngredient({
          ingredientName: 'Tonic',
          ingredientDefaultAbv: 0,
        }),
        createIngredient({
          ingredientName: '   ',
          ingredientDefaultAbv: 20,
        }),
      ]),
    ).toEqual(['Gin']);
  });
});
