import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CocktailLifecycleDto, ListTrashDto } from './cocktail-lifecycle.dto';

describe('Lifecycle HTTP validation', () => {
  it.each([
    {},
    { expectedContentVersion: null },
    { expectedContentVersion: 0, expectedOrganizationVersion: 2147483647 },
  ])(
    'preserves absent preconditions for the service conflict response: %j',
    async (body) => {
      expect(
        await validate(plainToInstance(CocktailLifecycleDto, body)),
      ).toHaveLength(0);
    },
  );
  it.each([-1, 0.5, '0', true, 2147483648])(
    'rejects invalid versions in either domain: %j',
    async (value) => {
      for (const key of [
        'expectedContentVersion',
        'expectedOrganizationVersion',
      ])
        expect(
          (
            await validate(
              plainToInstance(CocktailLifecycleDto, { [key]: value }),
            )
          ).length,
        ).toBeGreaterThan(0);
    },
  );
  it.each([
    { page: '0' },
    { page: '1000001' },
    { pageSize: '101' },
    { page: 'Infinity' },
  ])('bounds pagination: %j', async (query) => {
    expect(
      (await validate(plainToInstance(ListTrashDto, query))).length,
    ).toBeGreaterThan(0);
  });
});
