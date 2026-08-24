import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CocktailType,
  PrismaClient,
  RecipeMethod,
} from '../src/generated/prisma/client';
import { buildPostgresConnectionString } from '../src/database/postgres-connection-string';

loadEnv({ path: '../.env' });

interface SeedCocktail {
  slug: string;
  name: string;
  type: CocktailType;
  family: string;
  method: RecipeMethod;
  glass: string;
  mainAlcoholSlug: string;
  tagSlugs: string[];
}

const seedCocktails: SeedCocktail[] = [
  {
    slug: 'daiquiri',
    name: 'Daiquiri',
    type: CocktailType.CLASSIC,
    family: 'Sour',
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    mainAlcoholSlug: 'rhum-blanc',
    tagSlugs: ['classique', 'agrumes'],
  },
  {
    slug: 'espresso-martini',
    name: 'Espresso Martini',
    type: CocktailType.CLASSIC,
    family: 'After-dinner',
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    mainAlcoholSlug: 'vodka',
    tagSlugs: ['classique', 'cafe'],
  },
  {
    slug: 'negroni',
    name: 'Negroni',
    type: CocktailType.CLASSIC,
    family: 'Spirit-forward',
    method: RecipeMethod.MIXING_GLASS,
    glass: 'Old fashioned',
    mainAlcoholSlug: 'gin',
    tagSlugs: ['classique', 'amer'],
  },
];

function assertDevelopmentSeedAllowed(): void {
  if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new Error('Development seed is disabled when NODE_ENV=production.');
  }
}

function readEmailArgument(): string {
  const emailArgumentIndex = process.argv.indexOf('--email');

  if (emailArgumentIndex === -1) {
    throw new Error(
      'Missing --email argument. Example: npm run db:seed -- --email user@example.com',
    );
  }

  const email = process.argv[emailArgumentIndex + 1]?.trim().toLowerCase();

  if (!email) {
    throw new Error('The --email argument must contain an email address.');
  }

  return email;
}

function createPrismaClient(): PrismaClient {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !host || !port || !database) {
    throw new Error(
      'Database environment variables are required to run the seed.',
    );
  }

  const connectionString = buildPostgresConnectionString({
    user,
    password,
    host,
    port,
    database,
  });

  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}

async function main(): Promise<void> {
  assertDevelopmentSeedAllowed();

  const email = readEmailArgument();
  const prisma = createPrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        displayName: true,
        personalWorkspace: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error(`No Barbook user found for "${email}".`);
    }

    if (!user.personalWorkspace) {
      throw new Error(`User "${email}" does not have a personal workspace.`);
    }

    const workspaceId = user.personalWorkspace.id;

    await prisma.$transaction(async (transaction) => {
      const ingredients = await Promise.all([
        transaction.ingredient.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'gin',
            },
          },
          update: {
            name: 'Gin',
          },
          create: {
            workspaceId,
            slug: 'gin',
            name: 'Gin',
            defaultAbv: 40,
          },
          select: {
            id: true,
            slug: true,
          },
        }),
        transaction.ingredient.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'rhum-blanc',
            },
          },
          update: {
            name: 'Rhum blanc',
          },
          create: {
            workspaceId,
            slug: 'rhum-blanc',
            name: 'Rhum blanc',
            defaultAbv: 40,
          },
          select: {
            id: true,
            slug: true,
          },
        }),
        transaction.ingredient.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'vodka',
            },
          },
          update: {
            name: 'Vodka',
          },
          create: {
            workspaceId,
            slug: 'vodka',
            name: 'Vodka',
            defaultAbv: 40,
          },
          select: {
            id: true,
            slug: true,
          },
        }),
      ]);

      const tags = await Promise.all([
        transaction.tag.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'classique',
            },
          },
          update: {
            name: 'Classique',
          },
          create: {
            workspaceId,
            slug: 'classique',
            name: 'Classique',
          },
          select: {
            id: true,
            slug: true,
          },
        }),
        transaction.tag.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'agrumes',
            },
          },
          update: {
            name: 'Agrumes',
          },
          create: {
            workspaceId,
            slug: 'agrumes',
            name: 'Agrumes',
          },
          select: {
            id: true,
            slug: true,
          },
        }),
        transaction.tag.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'cafe',
            },
          },
          update: {
            name: 'Café',
          },
          create: {
            workspaceId,
            slug: 'cafe',
            name: 'Café',
          },
          select: {
            id: true,
            slug: true,
          },
        }),
        transaction.tag.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: 'amer',
            },
          },
          update: {
            name: 'Amer',
          },
          create: {
            workspaceId,
            slug: 'amer',
            name: 'Amer',
          },
          select: {
            id: true,
            slug: true,
          },
        }),
      ]);

      const ingredientBySlug = new Map(
        ingredients.map((ingredient) => [ingredient.slug, ingredient.id]),
      );

      const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));

      for (const cocktailSeed of seedCocktails) {
        const mainAlcoholId = ingredientBySlug.get(
          cocktailSeed.mainAlcoholSlug,
        );

        if (!mainAlcoholId) {
          throw new Error(
            `Missing seed ingredient "${cocktailSeed.mainAlcoholSlug}".`,
          );
        }

        const cocktail = await transaction.cocktail.upsert({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: cocktailSeed.slug,
            },
          },
          update: {
            name: cocktailSeed.name,
            type: cocktailSeed.type,
            family: cocktailSeed.family,
            method: cocktailSeed.method,
            glass: cocktailSeed.glass,
            mainAlcoholId,
          },
          create: {
            workspaceId,
            slug: cocktailSeed.slug,
            name: cocktailSeed.name,
            type: cocktailSeed.type,
            family: cocktailSeed.family,
            method: cocktailSeed.method,
            glass: cocktailSeed.glass,
            mainAlcoholId,
          },
          select: {
            id: true,
          },
        });

        await transaction.cocktailTag.deleteMany({
          where: {
            cocktailId: cocktail.id,
          },
        });

        const cocktailTags = cocktailSeed.tagSlugs.map((tagSlug) => {
          const tagId = tagBySlug.get(tagSlug);

          if (!tagId) {
            throw new Error(`Missing seed tag "${tagSlug}".`);
          }

          return {
            cocktailId: cocktail.id,
            tagId,
          };
        });

        await transaction.cocktailTag.createMany({
          data: cocktailTags,
        });
      }
    });

    console.log(
      `Seed completed for ${user.displayName} <${email}>: ${seedCocktails.length} cocktails available.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Development seed failed:', error);
  process.exit(1);
});
