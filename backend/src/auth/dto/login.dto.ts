import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : undefined,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}
