import { MeasurementUnit } from '../generated/prisma/client';
import {
  CocktailCreationInvariantError,
  CocktailCreationValidationError,
  requireCocktailCreationSlug,
  resolveMainAlcoholId,
  resolveRecipeAbvOverride,
  validateGarnishes,
  validateRecipeIngredients,
} from './cocktail-creation.rules';

describe('Cocktail creation rules', () => {
  describe('requireCocktailCreationSlug', () => {
    it('normalizes a valid value into its canonical slug', () => {
      expect(
        requireCocktailCreationSlug('  Gin Tonic  ', 'Cocktail name'),
      ).toBe('gin-tonic');
    });

    it('rejects a value that cannot produce a slug', () => {
      expect(() =>
        requireCocktailCreationSlug('--- !!! ---', 'Cocktail name'),
      ).toThrow(CocktailCreationValidationError);
    });
  });

  describe('validateRecipeIngredients', () => {
    it('accepts measured ingredients and TOP_UP without amount', () => {
      const slugs = validateRecipeIngredients([
        {
          ingredientName: 'Gin',
          ingredientDefaultAbv: 40,
          amount: 50,
          unit: MeasurementUnit.ML,
        },
        {
          ingredientName: 'Tonic',
          ingredientDefaultAbv: 0,
          unit: MeasurementUnit.TOP_UP,
        },
      ]);

      expect(slugs).toEqual(new Set(['gin', 'tonic']));
    });

    it('rejects TOP_UP when an amount is provided', () => {
      expect(() =>
        validateRecipeIngredients([
          {
            ingredientName: 'Tonic',
            ingredientDefaultAbv: 0,
            amount: 100,
            unit: MeasurementUnit.TOP_UP,
          },
        ]),
      ).toThrow('A TOP_UP ingredient must not define an amount.');
    });

    it('rejects a measured ingredient without an amount', () => {
      expect(() =>
        validateRecipeIngredients([
          {
            ingredientName: 'Gin',
            ingredientDefaultAbv: 40,
            unit: MeasurementUnit.ML,
          },
        ]),
      ).toThrow(
        'A recipe ingredient must define an amount unless its unit is TOP_UP.',
      );
    });

    it('rejects duplicate canonical ingredient slugs', () => {
      expect(() =>
        validateRecipeIngredients([
          {
            ingredientName: 'Gin',
            ingredientDefaultAbv: 40,
            amount: 30,
            unit: MeasurementUnit.ML,
          },
          {
            ingredientName: ' GIN ',
            ingredientDefaultAbv: 40,
            amount: 20,
            unit: MeasurementUnit.ML,
          },
        ]),
      ).toThrow('A recipe cannot contain the same ingredient more than once.');
    });
  });

  describe('validateGarnishes', () => {
    it('accepts a garnish without amount and unit', () => {
      expect(() =>
        validateGarnishes([
          {
            ingredientName: 'Citron jaune',
            usage: 'Exprimer un zeste au-dessus du verre.',
          },
        ]),
      ).not.toThrow();
    });

    it('accepts a garnish with both amount and unit', () => {
      expect(() =>
        validateGarnishes([
          {
            ingredientName: 'Cerise',
            amount: 1,
            unit: MeasurementUnit.PIECE,
            usage: 'Déposer dans le verre.',
          },
        ]),
      ).not.toThrow();
    });

    it('rejects a garnish with an amount but no unit', () => {
      expect(() =>
        validateGarnishes([
          {
            ingredientName: 'Cerise',
            amount: 1,
            usage: 'Déposer dans le verre.',
          },
        ]),
      ).toThrow(
        'Garnish amount and unit must either both be defined or both be omitted.',
      );
    });

    it('rejects a garnish with a unit but no amount', () => {
      expect(() =>
        validateGarnishes([
          {
            ingredientName: 'Cerise',
            unit: MeasurementUnit.PIECE,
            usage: 'Déposer dans le verre.',
          },
        ]),
      ).toThrow(
        'Garnish amount and unit must either both be defined or both be omitted.',
      );
    });

    it('rejects TOP_UP as a garnish unit', () => {
      expect(() =>
        validateGarnishes([
          {
            ingredientName: 'Tonic',
            amount: 1,
            unit: MeasurementUnit.TOP_UP,
            usage: 'Invalide.',
          },
        ]),
      ).toThrow('TOP_UP cannot be used for a garnish.');
    });
  });

  describe('resolveRecipeAbvOverride', () => {
    it('uses an explicit recipe override when provided', () => {
      expect(resolveRecipeAbvOverride(40, 47, 40)).toBe(47);
    });

    it('does not create an override when requested and persisted ABV match', () => {
      expect(resolveRecipeAbvOverride(40, undefined, 40)).toBeNull();
    });

    it('preserves a free-text ABV when the catalogue differs', () => {
      expect(resolveRecipeAbvOverride(47, undefined, 40)).toBe(47);
    });

    it('does not create an override when no requested ABV exists', () => {
      expect(resolveRecipeAbvOverride(undefined, undefined, 40)).toBeNull();

      expect(resolveRecipeAbvOverride(null, undefined, 40)).toBeNull();
    });
  });

  describe('resolveMainAlcoholId', () => {
    const ingredientsBySlug = new Map([
      [
        'gin',
        {
          id: 'ingredient-gin',
          defaultAbv: 40,
        },
      ],
      [
        'tonic',
        {
          id: 'ingredient-tonic',
          defaultAbv: 0,
        },
      ],
    ]);

    it('returns null when no main alcohol is selected', () => {
      expect(resolveMainAlcoholId(null, ingredientsBySlug, [])).toBeNull();
    });

    it('returns the selected alcoholic ingredient id', () => {
      expect(
        resolveMainAlcoholId('gin', ingredientsBySlug, [
          {
            ingredientId: 'ingredient-gin',
            ingredientSlug: 'gin',
            defaultAbv: 40,
            abvOverride: null,
            ingredient: {
              ingredientName: 'Gin',
              ingredientDefaultAbv: 40,
              amount: 50,
              unit: MeasurementUnit.ML,
            },
          },
        ]),
      ).toBe('ingredient-gin');
    });

    it('accepts a positive recipe override as the effective ABV', () => {
      expect(
        resolveMainAlcoholId('gin', ingredientsBySlug, [
          {
            ingredientId: 'ingredient-gin',
            ingredientSlug: 'gin',
            defaultAbv: 0,
            abvOverride: 47,
            ingredient: {
              ingredientName: 'Gin',
              ingredientDefaultAbv: 0,
              abvOverride: 47,
              amount: 50,
              unit: MeasurementUnit.ML,
            },
          },
        ]),
      ).toBe('ingredient-gin');
    });

    it('rejects a non-alcoholic selected ingredient', () => {
      expect(() =>
        resolveMainAlcoholId('tonic', ingredientsBySlug, [
          {
            ingredientId: 'ingredient-tonic',
            ingredientSlug: 'tonic',
            defaultAbv: 0,
            abvOverride: null,
            ingredient: {
              ingredientName: 'Tonic',
              ingredientDefaultAbv: 0,
              amount: 100,
              unit: MeasurementUnit.ML,
            },
          },
        ]),
      ).toThrow(CocktailCreationValidationError);
    });

    it('rejects a selected ingredient whose ABV is unknown', () => {
      const unknownIngredients = new Map([
        [
          'spiritueux-inconnu',
          {
            id: 'ingredient-unknown',
            defaultAbv: null,
          },
        ],
      ]);

      expect(() =>
        resolveMainAlcoholId('spiritueux-inconnu', unknownIngredients, [
          {
            ingredientId: 'ingredient-unknown',
            ingredientSlug: 'spiritueux-inconnu',
            defaultAbv: null,
            abvOverride: null,
            ingredient: {
              ingredientName: 'Spiritueux inconnu',
              ingredientDefaultAbv: null,
              amount: 50,
              unit: MeasurementUnit.ML,
            },
          },
        ]),
      ).toThrow(CocktailCreationValidationError);
    });

    it('raises an invariant error when the catalogue resolution is missing', () => {
      expect(() => resolveMainAlcoholId('gin', new Map(), [])).toThrow(
        CocktailCreationInvariantError,
      );
    });

    it('raises an invariant error when the resolved recipe line is missing', () => {
      expect(() => resolveMainAlcoholId('gin', ingredientsBySlug, [])).toThrow(
        CocktailCreationInvariantError,
      );
    });
  });
});
