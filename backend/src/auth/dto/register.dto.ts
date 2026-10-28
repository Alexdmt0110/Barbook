import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  @Length(2, 80)
  displayName!: string;
}
