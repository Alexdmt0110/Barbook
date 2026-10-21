import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
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
  credential: string;
}

export function browserHeaders(actor: Actor): Record<string, string> {
  return {
    ...originHeaders(),
    Cookie: `barbook-session-dev=${actor.credential}`,
    'X-Barbook-CSRF': actor.csrfToken,
    'X-Barbook-Expected-User': actor.user.id,
    'X-Barbook-Expected-Workspace': actor.workspaceId,
  };
}

export function originHeaders(): Record<string, string> {
  return { Origin: process.env.FRONTEND_ORIGIN!, 'X-Barbook-Request': '1' };
}

const actorEmails = new WeakMap<NestExpressApplication, string[]>();

export async function createApplicationFixture(
  registrationEmails: readonly string[] = [],
  actorSlots = 20,
): Promise<NestExpressApplication<Server>> {
  requireTestDatabase();
  const reserved = Array.from(
    { length: actorSlots },
    () => `qa-${randomUUID()}@example.test`,
  );
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(
      new ConfigService({
        ...process.env,
        REGISTRATION_ALLOWED_EMAILS: [...reserved, ...registrationEmails].join(
          ',',
        ),
      }),
    )
    .compile();
  const app = module.createNestApplication<NestExpressApplication<Server>>({
    logger: false,
  });
  configureApplication(app);
  await app.init();
  actorEmails.set(app, reserved);
  return app;
}

export async function createActor(app: NestExpressApplication): Promise<Actor> {
  const email = actorEmails.get(app)?.shift();
  if (!email) throw new Error('No reserved admitted fixture email remains.');
  const result = await app.get(AuthService).register({
    email,
    password: FIXTURE_PASSWORD,
    displayName: 'Fixture QA',
  });
  const workspace = await app.get(PrismaService).workspace.findUniqueOrThrow({
    where: { personalOwnerId: result.response.user.id },
  });
  return {
    ...result.response,
    credential: result.credential,
    workspaceId: workspace.id,
  };
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
