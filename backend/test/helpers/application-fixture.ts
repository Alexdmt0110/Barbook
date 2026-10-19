import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';
import { AuthResponse } from '../../src/auth/auth.types';
import { configureApplication } from '../../src/configure-application';
import { PrismaService } from '../../src/database/prisma.service';
import { CreateCocktailDto } from '../../src/cocktails/dto/create-cocktail.dto';
import {
  CocktailType,
  MeasurementUnit,
  RecipeMethod,
} from '../../src/generated/prisma/client';
import { requireTestDatabase } from './test-database';

export const FIXTURE_PASSWORD = 'Synthetic fixture password 42!';

export interface Actor extends AuthResponse {
  workspaceId: string;
}

export async function createApplicationFixture(): Promise<
  NestExpressApplication<Server>
> {
  requireTestDatabase();
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication<NestExpressApplication<Server>>({
    logger: false,
  });
  configureApplication(app);
  await app.init();
  return app;
}

export async function createActor(app: NestExpressApplication): Promise<Actor> {
  const result = await app.get(AuthService).register({
    email: `qa-${randomUUID()}@example.test`,
    password: FIXTURE_PASSWORD,
    displayName: 'Fixture QA',
  });
  const workspace = await app.get(PrismaService).workspace.findUniqueOrThrow({
    where: { personalOwnerId: result.user.id },
  });
  return { ...result, workspaceId: workspace.id };
}

export function recipePayload(
  overrides: Partial<CreateCocktailDto> = {},
): CreateCocktailDto {
  return {
    name: `Fixture ${randomUUID()}`,
    type: CocktailType.PERSONAL_CREATION,
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    mainAlcoholName: 'Gin',
    ingredients: [
      {
        ingredientName: 'Gin',
        ingredientDefaultAbv: 40,
        amount: 50,
        unit: MeasurementUnit.ML,
      },
    ],
    garnishes: [
      {
        ingredientName: 'Peel',
        amount: 1,
        unit: MeasurementUnit.PIECE,
        usage: 'Garnir.',
      },
    ],
    steps: ['Shaker puis filtrer.'],
    ...overrides,
  };
}
