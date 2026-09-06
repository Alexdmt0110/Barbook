import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCocktailOrganizationDto } from './update-cocktail-organization.dto';

describe('UpdateCocktailOrganizationDto', () => {
  it('accepts a folder and trims tag names', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: '550e8400-e29b-41d4-a716-446655440000',
      tagNames: ['  Classique  ', '  Agrumes  '],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.folderId).toBe('550e8400-e29b-41d4-a716-446655440000');

    expect(dto.tagNames).toEqual(['Classique', 'Agrumes']);
  });

  it('accepts an explicit null folder and an empty tag list', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: null,
      tagNames: [],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.folderId).toBeNull();
    expect(dto.tagNames).toEqual([]);
  });

  it('rejects an incomplete organization payload', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid folder UUID', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: 'not-a-uuid',
      tagNames: [],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects more than 20 tags', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: null,
      tagNames: Array.from(
        {
          length: 21,
        },
        (_, index) => `Tag ${index + 1}`,
      ),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a blank tag name', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: null,
      tagNames: ['   '],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a tag name longer than 40 characters', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: null,
      tagNames: ['a'.repeat(41)],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-string tag value', async () => {
    const dto = plainToInstance(UpdateCocktailOrganizationDto, {
      folderId: null,
      tagNames: ['Classique', 42],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
