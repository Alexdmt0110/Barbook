import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  garnishMeasurementValidator,
  ingredientMeasurementValidator,
  MAX_STORED_AMOUNT,
  trimmedRequiredValidator,
  uniqueCanonicalIngredientsValidator,
} from './cocktail-create.form';

describe('cocktail creation form validators', () => {
  describe('trimmedRequiredValidator', () => {
    it('rejects whitespace-only text', () => {
      const control = new FormControl('   ', {
        nonNullable: true,
        validators: [trimmedRequiredValidator()],
      });

      expect(control.valid).toBe(false);
    });

    it('uses trimmed content for the minimum length', () => {
      const control = new FormControl(' a ', {
        nonNullable: true,
        validators: [trimmedRequiredValidator(2)],
      });

      expect(control.valid).toBe(false);

      control.setValue(' ab ');

      expect(control.valid).toBe(true);
    });
  });

  describe('uniqueCanonicalIngredientsValidator', () => {
    it('rejects duplicate canonical ingredient names', () => {
      const ingredients = new FormArray(
        [
          new FormGroup({
            ingredientName: new FormControl('Gin', {
              nonNullable: true,
            }),
          }),
          new FormGroup({
            ingredientName: new FormControl(' GIN ', {
              nonNullable: true,
            }),
          }),
        ],
        {
          validators: [uniqueCanonicalIngredientsValidator],
        },
      );

      expect(ingredients.hasError('duplicateCanonicalIngredient')).toBe(true);
    });

    it('accepts different canonical ingredients', () => {
      const ingredients = new FormArray(
        [
          new FormGroup({
            ingredientName: new FormControl('Gin', {
              nonNullable: true,
            }),
          }),
          new FormGroup({
            ingredientName: new FormControl('Tonic', {
              nonNullable: true,
            }),
          }),
        ],
        {
          validators: [uniqueCanonicalIngredientsValidator],
        },
      );

      expect(ingredients.valid).toBe(true);
    });
  });

  describe('ingredientMeasurementValidator', () => {
    it('rejects a centilitre amount that exceeds the storage limit after conversion', () => {
      const group = new FormGroup(
        {
          amount: new FormControl(10_000),
          unit: new FormControl('CL'),
        },
        {
          validators: [ingredientMeasurementValidator],
        },
      );

      expect(group.hasError('amountMax')).toBe(true);
    });

    it('accepts an amount equal to the storage limit in millilitres', () => {
      const group = new FormGroup(
        {
          amount: new FormControl(MAX_STORED_AMOUNT),
          unit: new FormControl('ML'),
        },
        {
          validators: [ingredientMeasurementValidator],
        },
      );

      expect(group.valid).toBe(true);
    });
  });

  describe('garnishMeasurementValidator', () => {
    it('rejects an amount without a unit', () => {
      const group = new FormGroup(
        {
          amount: new FormControl(1),
          unit: new FormControl(''),
        },
        {
          validators: [garnishMeasurementValidator],
        },
      );

      expect(group.hasError('amountUnitPair')).toBe(true);
    });

    it('rejects an excessive converted amount', () => {
      const group = new FormGroup(
        {
          amount: new FormControl(10_000),
          unit: new FormControl('CL'),
        },
        {
          validators: [garnishMeasurementValidator],
        },
      );

      expect(group.hasError('amountMax')).toBe(true);
    });
  });
});
