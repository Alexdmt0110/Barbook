import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { toSlug } from '../src/common/slug';
import {
  CocktailType,
  MeasurementUnit,
  PrismaClient,
  RecipeMethod,
} from '../src/generated/prisma/client';
import { buildPostgresConnectionString } from '../src/database/postgres-connection-string';

loadEnv({ path: '../.env' });

interface SeedIngredient {
  slug: string;
  name: string;
  defaultAbv: number;
}

interface SeedRecipeIngredient {
  ingredientSlug: string;
  amount: number | null;
  unit: MeasurementUnit;
  specification?: string;
  abvOverride?: number;
  notes?: string;
}

interface SeedGarnish {
  ingredientSlug: string;
  amount: number | null;
  unit: MeasurementUnit | null;
  specification?: string;
  usage: string;
}

interface SeedCocktail {
  slug: string;
  name: string;
  type: CocktailType;
  family: string;
  method: RecipeMethod;
  glass: string;
  ice: string | null;
  notes: string | null;
  mainAlcoholSlug: string;
  tagSlugs: string[];
  ingredients: SeedRecipeIngredient[];
  garnishes: SeedGarnish[];
  steps: string[];
}

interface LegacySeedIngredientSlug {
  legacySlug: string;
  canonicalSlug: string;
}

function defineSeedIngredient(
  name: string,
  defaultAbv: number,
): SeedIngredient {
  const slug = toSlug(name);

  if (!slug) {
    throw new Error(`Invalid seed ingredient name "${name}".`);
  }

  return {
    slug,
    name,
    defaultAbv,
  };
}

function defineLegacySeedIngredientSlug(
  legacySlug: string,
  canonicalName: string,
): LegacySeedIngredientSlug {
  const canonicalSlug = toSlug(canonicalName);

  if (!canonicalSlug) {
    throw new Error(
      `Invalid canonical seed ingredient name "${canonicalName}".`,
    );
  }

  if (legacySlug === canonicalSlug) {
    throw new Error(
      `Legacy ingredient slug "${legacySlug}" must differ from its canonical slug.`,
    );
  }

  return {
    legacySlug,
    canonicalSlug,
  };
}

const seedIngredients: SeedIngredient[] = [
  defineSeedIngredient('Gin', 40),
  defineSeedIngredient('Rhum blanc', 40),
  defineSeedIngredient('Vodka', 40),
  defineSeedIngredient('Jus de citron vert', 0),
  defineSeedIngredient('Citron vert', 0),
  defineSeedIngredient('Sirop de sucre', 0),
  defineSeedIngredient('Campari', 25),
  defineSeedIngredient('Vermouth rouge', 16),
  defineSeedIngredient('Orange', 0),
  defineSeedIngredient('Liqueur de café', 20),
  defineSeedIngredient('Espresso', 0),
  defineSeedIngredient('Grains de café', 0),
];

const legacySeedIngredientSlugs: LegacySeedIngredientSlug[] = [
  defineLegacySeedIngredientSlug('jus-citron-vert', 'Jus de citron vert'),
  defineLegacySeedIngredientSlug('sirop-sucre', 'Sirop de sucre'),
  defineLegacySeedIngredientSlug('liqueur-cafe', 'Liqueur de café'),
  defineLegacySeedIngredientSlug('grains-cafe', 'Grains de café'),
];

const seedTags = [
  {
    slug: 'classique',
    name: 'Classique',
  },
  {
    slug: 'agrumes',
    name: 'Agrumes',
  },
  {
    slug: 'cafe',
    name: 'Café',
  },
  {
    slug: 'amer',
    name: 'Amer',
  },
];

const seedCocktails: SeedCocktail[] = [
  {
    slug: 'daiquiri',
    name: 'Daiquiri',
    type: CocktailType.CLASSIC,
    family: 'Sour',
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    ice: null,
    notes:
      'Servir bien frais. Ajuster légèrement le sucre selon l’acidité du citron vert.',
    mainAlcoholSlug: 'rhum-blanc',
    tagSlugs: ['classique', 'agrumes'],
    ingredients: [
      {
        ingredientSlug: 'rhum-blanc',
        amount: 50,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'jus-de-citron-vert',
        amount: 25,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'sirop-de-sucre',
        amount: 15,
        unit: MeasurementUnit.ML,
        notes: 'Sirop simple 1:1.',
      },
    ],
    garnishes: [
      {
        ingredientSlug: 'citron-vert',
        amount: 1,
        unit: MeasurementUnit.PIECE,
        usage: 'Fine rondelle de citron vert.',
      },
    ],
    steps: [
      'Verser tous les ingrédients dans un shaker.',
      'Ajouter de la glace et shaker vivement.',
      'Double filtrer dans une coupe préalablement refroidie.',
      'Ajouter la garniture.',
    ],
  },
  {
    slug: 'espresso-martini',
    name: 'Espresso Martini',
    type: CocktailType.CLASSIC,
    family: 'After-dinner',
    method: RecipeMethod.SHAKER,
    glass: 'Coupe',
    ice: null,
    notes:
      'Utiliser un espresso fraîchement préparé et shaker vigoureusement pour obtenir une mousse dense.',
    mainAlcoholSlug: 'vodka',
    tagSlugs: ['classique', 'cafe'],
    ingredients: [
      {
        ingredientSlug: 'vodka',
        amount: 40,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'liqueur-de-cafe',
        amount: 20,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'espresso',
        amount: 30,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'sirop-de-sucre',
        amount: 10,
        unit: MeasurementUnit.ML,
        notes: 'Sirop simple 1:1.',
      },
    ],
    garnishes: [
      {
        ingredientSlug: 'grains-de-cafe',
        amount: 3,
        unit: MeasurementUnit.PIECE,
        usage: 'Déposer trois grains de café sur la mousse.',
      },
    ],
    steps: [
      'Préparer un espresso.',
      'Verser la vodka, la liqueur de café, l’espresso et le sirop dans un shaker.',
      'Ajouter beaucoup de glace et shaker vigoureusement.',
      'Double filtrer dans une coupe préalablement refroidie.',
      'Déposer les trois grains de café sur la mousse.',
    ],
  },
  {
    slug: 'negroni',
    name: 'Negroni',
    type: CocktailType.CLASSIC,
    family: 'Spirit-forward',
    method: RecipeMethod.MIXING_GLASS,
    glass: 'Old fashioned',
    ice: 'Gros glaçon',
    notes:
      'Chercher une dilution suffisante sans perdre la structure amère du cocktail.',
    mainAlcoholSlug: 'gin',
    tagSlugs: ['classique', 'amer'],
    ingredients: [
      {
        ingredientSlug: 'gin',
        amount: 30,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'campari',
        amount: 30,
        unit: MeasurementUnit.ML,
      },
      {
        ingredientSlug: 'vermouth-rouge',
        amount: 30,
        unit: MeasurementUnit.ML,
      },
    ],
    garnishes: [
      {
        ingredientSlug: 'orange',
        amount: null,
        unit: null,
        usage: 'Exprimer un zeste d’orange au-dessus du verre puis le déposer.',
      },
    ],
    steps: [
      'Verser le gin, le Campari et le vermouth rouge dans un verre à mélange.',
      'Ajouter de la glace et remuer jusqu’à obtenir la dilution souhaitée.',
      'Filtrer dans un verre old fashioned sur un gros glaçon.',
      'Exprimer le zeste d’orange puis garnir.',
    ],
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

function requireMapValue(
  values: ReadonlyMap<string, string>,
  key: string,
  entityName: string,
): string {
  const value = values.get(key);

  if (!value) {
    throw new Error(`Missing seed ${entityName} "${key}".`);
  }

  return value;
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
      const ingredients = await Promise.all(
        seedIngredients.map((ingredient) =>
          transaction.ingredient.upsert({
            where: {
              workspaceId_slug: {
                workspaceId,
                slug: ingredient.slug,
              },
            },
            update: {
              name: ingredient.name,
              defaultAbv: ingredient.defaultAbv,
            },
            create: {
              workspaceId,
              slug: ingredient.slug,
              name: ingredient.name,
              defaultAbv: ingredient.defaultAbv,
            },
            select: {
              id: true,
              slug: true,
            },
          }),
        ),
      );

      const tags = await Promise.all(
        seedTags.map((tag) =>
          transaction.tag.upsert({
            where: {
              workspaceId_slug: {
                workspaceId,
                slug: tag.slug,
              },
            },
            update: {
              name: tag.name,
            },
            create: {
              workspaceId,
              slug: tag.slug,
              name: tag.name,
            },
            select: {
              id: true,
              slug: true,
            },
          }),
        ),
      );

      const ingredientBySlug = new Map(
        ingredients.map((ingredient) => [ingredient.slug, ingredient.id]),
      );

      for (const { legacySlug, canonicalSlug } of legacySeedIngredientSlugs) {
        const canonicalIngredientId = requireMapValue(
          ingredientBySlug,
          canonicalSlug,
          'ingredient',
        );

        const legacyIngredient = await transaction.ingredient.findUnique({
          where: {
            workspaceId_slug: {
              workspaceId,
              slug: legacySlug,
            },
          },
          select: {
            id: true,
          },
        });

        if (!legacyIngredient) {
          continue;
        }

        if (legacyIngredient.id === canonicalIngredientId) {
          throw new Error(
            `Legacy ingredient "${legacySlug}" unexpectedly resolves to the canonical ingredient.`,
          );
        }

        await transaction.cocktailIngredient.updateMany({
          where: {
            ingredientId: legacyIngredient.id,
          },
          data: {
            ingredientId: canonicalIngredientId,
          },
        });

        await transaction.garnishIngredient.updateMany({
          where: {
            ingredientId: legacyIngredient.id,
          },
          data: {
            ingredientId: canonicalIngredientId,
          },
        });

        await transaction.cocktail.updateMany({
          where: {
            mainAlcoholId: legacyIngredient.id,
          },
          data: {
            mainAlcoholId: canonicalIngredientId,
          },
        });

        await transaction.ingredient.delete({
          where: {
            id: legacyIngredient.id,
          },
        });
      }

      const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));

      for (const cocktailSeed of seedCocktails) {
        const mainAlcoholId = requireMapValue(
          ingredientBySlug,
          cocktailSeed.mainAlcoholSlug,
          'ingredient',
        );

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
            ice: cocktailSeed.ice,
            notes: cocktailSeed.notes,
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
            ice: cocktailSeed.ice,
            notes: cocktailSeed.notes,
            mainAlcoholId,
          },
          select: {
            id: true,
          },
        });

        await Promise.all([
          transaction.cocktailIngredient.deleteMany({
            where: {
              cocktailId: cocktail.id,
            },
          }),
          transaction.garnishIngredient.deleteMany({
            where: {
              cocktailId: cocktail.id,
            },
          }),
          transaction.preparationStep.deleteMany({
            where: {
              cocktailId: cocktail.id,
            },
          }),
          transaction.cocktailTag.deleteMany({
            where: {
              cocktailId: cocktail.id,
            },
          }),
        ]);

        const recipeIngredients = cocktailSeed.ingredients.map(
          (ingredient, index) => ({
            cocktailId: cocktail.id,
            ingredientId: requireMapValue(
              ingredientBySlug,
              ingredient.ingredientSlug,
              'ingredient',
            ),
            amount: ingredient.amount,
            unit: ingredient.unit,
            specification: ingredient.specification ?? null,
            abvOverride: ingredient.abvOverride ?? null,
            notes: ingredient.notes ?? null,
            sortOrder: index + 1,
          }),
        );

        const garnishes = cocktailSeed.garnishes.map((garnish, index) => ({
          cocktailId: cocktail.id,
          ingredientId: requireMapValue(
            ingredientBySlug,
            garnish.ingredientSlug,
            'ingredient',
          ),
          amount: garnish.amount,
          unit: garnish.unit,
          specification: garnish.specification ?? null,
          usage: garnish.usage,
          sortOrder: index + 1,
        }));

        const steps = cocktailSeed.steps.map((content, index) => ({
          cocktailId: cocktail.id,
          content,
          sortOrder: index + 1,
        }));

        const cocktailTags = cocktailSeed.tagSlugs.map((tagSlug) => ({
          cocktailId: cocktail.id,
          tagId: requireMapValue(tagBySlug, tagSlug, 'tag'),
        }));

        if (recipeIngredients.length > 0) {
          await transaction.cocktailIngredient.createMany({
            data: recipeIngredients,
          });
        }

        if (garnishes.length > 0) {
          await transaction.garnishIngredient.createMany({
            data: garnishes,
          });
        }

        if (steps.length > 0) {
          await transaction.preparationStep.createMany({
            data: steps,
          });
        }

        if (cocktailTags.length > 0) {
          await transaction.cocktailTag.createMany({
            data: cocktailTags,
          });
        }
      }
    });

    console.log(
      `Seed completed for ${user.displayName} <${email}>: ${seedCocktails.length} complete cocktails available.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Development seed failed:', error);

  process.exit(1);
});
