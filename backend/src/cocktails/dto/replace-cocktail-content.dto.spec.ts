import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceCocktailContentDto } from './replace-cocktail-content.dto';

const payload = {
  name: 'Edited recipe',
  type: 'CLASSIC',
  method: 'BUILD',
  glass: 'Coupe',
  expectedContentVersion: 0,
  ingredients: [
    { ingredientName: 'Gin', amount: 50, unit: 'ML', abvMode: 'INHERIT' },
  ],
  steps: ['Build.'],
};
describe('Content replacement boundary', () => {
  it.each(['INHERIT', 'OVERRIDE', 'UNKNOWN'])(
    'validates inherited nested constraints and mode %s',
    async (abvMode) => {
      const dto = plainToInstance(ReplaceCocktailContentDto, {
        ...payload,
        ingredients: [
          {
            ...payload.ingredients[0],
            abvMode,
            abvOverride: abvMode === 'OVERRIDE' ? 0 : null,
          },
        ],
      });
      expect(dto.ingredients[0].constructor.name).toBe(
        'EditCocktailIngredientDto',
      );
      expect(
        await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
      ).toHaveLength(0);
    },
  );
  it.each([
    { amount: 0 },
    { unit: 'CL' },
    { abvMode: undefined },
    { abvMode: 'AUTO' },
    { abvOverride: 100.01 },
    { abvUnknown: true },
  ])('rejects invalid nested content %j', async (change) => {
    const dto = plainToInstance(ReplaceCocktailContentDto, {
      ...payload,
      ingredients: [{ ...payload.ingredients[0], ...change }],
    });
    expect(
      (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
        .length,
    ).toBeGreaterThan(0);
  });
  it.each([
    'id',
    'workspaceId',
    'slug',
    'imageUrl',
    'folderIds',
    'deletedAt',
    'contentVersion',
  ])('refuses immutable field %s', async (field) => {
    const dto = plainToInstance(ReplaceCocktailContentDto, {
      ...payload,
      [field]: 'injected',
    });
    expect(
      (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
        .length,
    ).toBeGreaterThan(0);
  });
});
