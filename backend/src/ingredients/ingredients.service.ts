import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IngredientSuggestion } from './ingredient.types';

const MIN_SEARCH_LENGTH = 3;
const MAX_SEARCH_LENGTH = 120;
const MAX_SUGGESTIONS = 8;

interface IngredientSearchRecord {
  id: string;
  name: string;
  slug: string;
  defaultAbv: {
    toString(): string;
  } | null;
}

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPersonalIngredients(
    userId: string,
    query: string,
  ): Promise<IngredientSuggestion[]> {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < MIN_SEARCH_LENGTH) {
      return [];
    }

    if (normalizedQuery.length > MAX_SEARCH_LENGTH) {
      throw new BadRequestException('Ingredient search query is too long.');
    }

    const personalWorkspace = await this.prisma.workspace.findUnique({
      where: {
        personalOwnerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!personalWorkspace) {
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    }

    const suggestions: IngredientSuggestion[] = [];

    const seenIngredientIds = new Set<string>();

    await this.appendExactMatches(
      personalWorkspace.id,
      normalizedQuery,
      suggestions,
      seenIngredientIds,
    );

    await this.appendPrefixMatches(
      personalWorkspace.id,
      normalizedQuery,
      suggestions,
      seenIngredientIds,
    );

    if (suggestions.length >= MAX_SUGGESTIONS) {
      return suggestions;
    }

    await this.appendWordStartMatches(
      personalWorkspace.id,
      normalizedQuery,
      suggestions,
      seenIngredientIds,
    );

    if (suggestions.length >= MAX_SUGGESTIONS) {
      return suggestions;
    }

    await this.appendContainsMatches(
      personalWorkspace.id,
      normalizedQuery,
      suggestions,
      seenIngredientIds,
    );

    return suggestions;
  }

  private async appendExactMatches(
    workspaceId: string,
    query: string,
    suggestions: IngredientSuggestion[],
    seenIngredientIds: Set<string>,
  ): Promise<void> {
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        workspaceId,
        name: {
          equals: query,
          mode: 'insensitive',
        },
      },
      take: 1,
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    this.appendSuggestions(suggestions, seenIngredientIds, ingredients);
  }

  private async appendPrefixMatches(
    workspaceId: string,
    query: string,
    suggestions: IngredientSuggestion[],
    seenIngredientIds: Set<string>,
  ): Promise<void> {
    const remainingSlots = this.remainingSuggestionSlots(suggestions);

    if (remainingSlots === 0) {
      return;
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        workspaceId,
        ...this.excludedIngredientsFilter(seenIngredientIds),
        name: {
          startsWith: query,
          mode: 'insensitive',
        },
      },
      take: remainingSlots,
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    this.appendSuggestions(suggestions, seenIngredientIds, ingredients);
  }

  private async appendWordStartMatches(
    workspaceId: string,
    query: string,
    suggestions: IngredientSuggestion[],
    seenIngredientIds: Set<string>,
  ): Promise<void> {
    const remainingSlots = this.remainingSuggestionSlots(suggestions);

    if (remainingSlots === 0) {
      return;
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        workspaceId,
        ...this.excludedIngredientsFilter(seenIngredientIds),
        OR: [
          {
            name: {
              contains: ` ${query}`,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: `-${query}`,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: `'${query}`,
              mode: 'insensitive',
            },
          },
        ],
      },
      take: remainingSlots,
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    this.appendSuggestions(suggestions, seenIngredientIds, ingredients);
  }

  private async appendContainsMatches(
    workspaceId: string,
    query: string,
    suggestions: IngredientSuggestion[],
    seenIngredientIds: Set<string>,
  ): Promise<void> {
    const remainingSlots = this.remainingSuggestionSlots(suggestions);

    if (remainingSlots === 0) {
      return;
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        workspaceId,
        ...this.excludedIngredientsFilter(seenIngredientIds),
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: remainingSlots,
      orderBy: [
        {
          name: 'asc',
        },
        {
          id: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    this.appendSuggestions(suggestions, seenIngredientIds, ingredients);
  }

  private appendSuggestions(
    suggestions: IngredientSuggestion[],
    seenIngredientIds: Set<string>,
    ingredients: IngredientSearchRecord[],
  ): void {
    for (const ingredient of ingredients) {
      if (suggestions.length >= MAX_SUGGESTIONS) {
        return;
      }

      if (seenIngredientIds.has(ingredient.id)) {
        continue;
      }

      seenIngredientIds.add(ingredient.id);

      suggestions.push({
        id: ingredient.id,
        name: ingredient.name,
        slug: ingredient.slug,
        defaultAbv: this.decimalToNumber(ingredient.defaultAbv),
      });
    }
  }

  private remainingSuggestionSlots(
    suggestions: IngredientSuggestion[],
  ): number {
    return Math.max(MAX_SUGGESTIONS - suggestions.length, 0);
  }

  private excludedIngredientsFilter(seenIngredientIds: Set<string>):
    | {
        id: {
          notIn: string[];
        };
      }
    | Record<string, never> {
    if (seenIngredientIds.size === 0) {
      return {};
    }

    return {
      id: {
        notIn: [...seenIngredientIds],
      },
    };
  }

  private decimalToNumber(
    value: {
      toString(): string;
    } | null,
  ): number | null {
    if (value === null) {
      return null;
    }

    return Number(value.toString());
  }
}
