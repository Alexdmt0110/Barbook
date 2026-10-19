import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFolderDto } from './create-folder.dto';

describe('CreateFolderDto', () => {
  it('accepts and trims a valid folder name', async () => {
    const dto = plainToInstance(CreateFolderDto, {
      name: '  Classiques  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);

    expect(dto.name).toBe('Classiques');
  });

  it('rejects a blank folder name', async () => {
    const dto = plainToInstance(CreateFolderDto, {
      name: '   ',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a folder name longer than 80 characters', async () => {
    const dto = plainToInstance(CreateFolderDto, {
      name: 'a'.repeat(81),
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a non-string folder name', async () => {
    const dto = plainToInstance(CreateFolderDto, {
      name: 42,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
