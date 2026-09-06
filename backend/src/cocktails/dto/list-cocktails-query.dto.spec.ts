import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CocktailType, RecipeMethod } from '../../generated/prisma/client';
import { ListCocktailsQueryDto } from './list-cocktails-query.dto';

describe('ListCocktailsQueryDto', () => {
  it('accepts and transforms a complete valid query', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      search: '  negroni  ',
      type: CocktailType.CLASSIC,
      method: RecipeMethod.MIXING_GLASS,
      page: '2',
      pageSize: '24',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.search).toBe('negroni');
    expect(dto.type).toBe(CocktailType.CLASSIC);
    expect(dto.method).toBe(RecipeMethod.MIXING_GLASS);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(24);
  });

  it('accepts an empty query', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.search).toBeUndefined();
    expect(dto.type).toBeUndefined();
    expect(dto.method).toBeUndefined();
    expect(dto.page).toBeUndefined();
    expect(dto.pageSize).toBeUndefined();
  });

  it('normalizes a blank search to an omitted value', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      search: '   ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.search).toBeUndefined();
  });

  it('rejects a search longer than 120 characters', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      search: 'a'.repeat(121),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unsupported cocktail filters', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      type: 'UNKNOWN',
      method: 'STIRRED_BY_MAGIC',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects pagination outside the accepted bounds', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      page: '0',
      pageSize: '101',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-numeric pagination values', async () => {
    const dto = plainToInstance(ListCocktailsQueryDto, {
      page: 'two',
      pageSize: 'many',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
