import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../../generated/prisma/client';
import { CreateCocktailDto } from './create-cocktail.dto';

function buildPayload(amount: number): Record<string, unknown> {
  return {
    name: 'Test cocktail',
    type: CocktailType.PERSONAL_CREATION,
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    ingredients: [
      {
        ingredientName: 'Gin',
        ingredientDefaultAbv: 40,
        amount,
        unit: MeasurementUnit.ML,
      },
    ],
    steps: ['Shaker puis filtrer.'],
  };
}

describe('CreateCocktailDto', () => {
  it('accepts the largest amount representable by Decimal(8,3)', async () => {
    const dto = plainToInstance(CreateCocktailDto, buildPayload(99_999.999));

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an amount larger than Decimal(8,3) can store', async () => {
    const dto = plainToInstance(CreateCocktailDto, buildPayload(100_000));

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a cocktail name containing only whitespace after normalization', async () => {
    const payload = buildPayload(50);

    payload['name'] = '   ';

    const dto = plainToInstance(CreateCocktailDto, payload);

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a preparation step containing only whitespace after normalization', async () => {
    const payload = buildPayload(50);

    payload['steps'] = ['   '];

    const dto = plainToInstance(CreateCocktailDto, payload);

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
