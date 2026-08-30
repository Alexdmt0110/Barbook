import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IngredientSuggestion } from './ingredient.types';

const MIN_SEARCH_LENGTH = 3;
const MAX_SEARCH_LENGTH = 120;
const MAX_DATABASE_CANDIDATES = 24;
const MAX_SUGGESTIONS = 8;

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

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        workspaceId: personalWorkspace.id,
        name: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
      },
      take: MAX_DATABASE_CANDIDATES,
      select: {
        id: true,
        name: true,
        slug: true,
        defaultAbv: true,
      },
    });

    const lowerQuery = normalizedQuery.toLocaleLowerCase('fr-FR');

    return ingredients
      .map((ingredient) => ({
        suggestion: {
          id: ingredient.id,
          name: ingredient.name,
          slug: ingredient.slug,
          defaultAbv: this.decimalToNumber(ingredient.defaultAbv),
        },
        relevance: this.calculateRelevance(ingredient.name, lowerQuery),
      }))
      .sort(
        (left, right) =>
          left.relevance - right.relevance ||
          left.suggestion.name.localeCompare(right.suggestion.name, 'fr-FR'),
      )
      .slice(0, MAX_SUGGESTIONS)
      .map(({ suggestion }) => suggestion);
  }

  private calculateRelevance(
    ingredientName: string,
    lowerQuery: string,
  ): number {
    const lowerName = ingredientName.toLocaleLowerCase('fr-FR');

    if (lowerName === lowerQuery) {
      return 0;
    }

    if (lowerName.startsWith(lowerQuery)) {
      return 1;
    }

    const words = lowerName.split(/[\s\-']/u);

    if (words.some((word) => word.startsWith(lowerQuery))) {
      return 2;
    }

    return 3;
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
