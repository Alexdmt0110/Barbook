import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchIngredientsQueryDto } from './search-ingredients-query.dto';

describe('SearchIngredientsQueryDto', () => {
  it('accepts and trims a valid query', async () => {
    const dto = plainToInstance(SearchIngredientsQueryDto, {
      query: '  gin  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.query).toBe('gin');
  });

  it('accepts an omitted query', async () => {
    const dto = plainToInstance(SearchIngredientsQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.query).toBeUndefined();
  });

  it('rejects a query longer than 120 characters', async () => {
    const dto = plainToInstance(SearchIngredientsQueryDto, {
      query: 'a'.repeat(121),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-string query instead of letting it reach the service', async () => {
    const dto = plainToInstance(SearchIngredientsQueryDto, {
      query: ['gin', 'vodka'],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
