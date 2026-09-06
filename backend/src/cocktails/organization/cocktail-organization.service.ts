import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaKnownRequestError } from '../../common/prisma-errors';
import { toSlug } from '../../common/slug';
import { PrismaService } from '../../database/prisma.service';
import { CocktailOrganizationResult } from './cocktail-organization.types';
import { CocktailOrganizationFolder } from './cocktail-organization.types';
import { CocktailOrganizationTag } from './cocktail-organization.types';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateCocktailOrganizationDto } from './dto/update-cocktail-organization.dto';

interface NormalizedTag {
  name: string;
  slug: string;
}

const MAX_TAGS_PER_COCKTAIL = 20;
const MAX_TAG_NAME_LENGTH = 40;
const MAX_FOLDER_NAME_LENGTH = 80;

@Injectable()
export class CocktailOrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listPersonalFolders(
    userId: string,
  ): Promise<CocktailOrganizationFolder[]> {
    const workspaceId = await this.requirePersonalWorkspaceId(userId);

    return this.prisma.folder.findMany({
      where: {
        workspaceId,
      },
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
      },
    });
  }

  async createPersonalFolder(
    userId: string,
    dto: CreateFolderDto,
  ): Promise<CocktailOrganizationFolder> {
    const workspaceId = await this.requirePersonalWorkspaceId(userId);

    const name = dto.name.trim();

    if (name.length === 0 || name.length > MAX_FOLDER_NAME_LENGTH) {
      throw new BadRequestException('Folder name is invalid.');
    }

    const existingFolder = await this.prisma.folder.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingFolder) {
      throw new ConflictException('A folder with this name already exists.');
    }

    try {
      return await this.prisma.folder.create({
        data: {
          workspaceId,
          name,
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error: unknown) {
      if (isPrismaKnownRequestError(error, 'P2002')) {
        throw new ConflictException('A folder with this name already exists.');
      }

      throw error;
    }
  }

  async listPersonalTags(userId: string): Promise<CocktailOrganizationTag[]> {
    const workspaceId = await this.requirePersonalWorkspaceId(userId);

    return this.prisma.tag.findMany({
      where: {
        workspaceId,
      },
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
      },
    });
  }

  async updatePersonalCocktailOrganization(
    userId: string,
    cocktailSlug: string,
    dto: UpdateCocktailOrganizationDto,
  ): Promise<CocktailOrganizationResult> {
    const workspaceId = await this.requirePersonalWorkspaceId(userId);

    const normalizedTags = this.normalizeTagNames(dto.tagNames);

    return this.prisma.$transaction(async (transaction) => {
      const cocktail = await transaction.cocktail.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: cocktailSlug,
          },
        },
        select: {
          id: true,
        },
      });

      if (!cocktail) {
        throw new NotFoundException('Cocktail not found.');
      }

      let folder: CocktailOrganizationFolder | null = null;

      if (dto.folderId !== null) {
        folder = await transaction.folder.findUnique({
          where: {
            workspaceId_id: {
              workspaceId,
              id: dto.folderId,
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!folder) {
          throw new BadRequestException('Folder is unavailable.');
        }
      }

      let tags: CocktailOrganizationTag[] = [];

      if (normalizedTags.length > 0) {
        await transaction.tag.createMany({
          data: normalizedTags.map((tag) => ({
            workspaceId,
            name: tag.name,
            slug: tag.slug,
          })),
          skipDuplicates: true,
        });

        const requestedTagSlugs = normalizedTags.map((tag) => tag.slug);

        tags = await transaction.tag.findMany({
          where: {
            workspaceId,
            slug: {
              in: requestedTagSlugs,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        if (tags.length !== normalizedTags.length) {
          throw new InternalServerErrorException(
            'Cocktail tags could not be resolved.',
          );
        }
      }

      /*
       * L'UPDATE verrouille la ligne du cocktail avant
       * le remplacement des associations de tags.
       * Deux modifications concurrentes du même cocktail
       * sont ainsi sérialisées par PostgreSQL.
       */
      await transaction.cocktail.update({
        where: {
          workspaceId_id: {
            workspaceId,
            id: cocktail.id,
          },
        },
        data: {
          folderId: folder?.id ?? null,
        },
      });

      await transaction.cocktailTag.deleteMany({
        where: {
          workspaceId,
          cocktailId: cocktail.id,
        },
      });

      if (tags.length > 0) {
        await transaction.cocktailTag.createMany({
          data: tags.map((tag) => ({
            workspaceId,
            cocktailId: cocktail.id,
            tagId: tag.id,
          })),
        });
      }

      tags.sort((left, right) => {
        const nameComparison = left.name.localeCompare(right.name, 'fr', {
          sensitivity: 'base',
        });

        return nameComparison !== 0
          ? nameComparison
          : left.id.localeCompare(right.id);
      });

      return {
        folder,
        tags,
      };
    });
  }

  private async requirePersonalWorkspaceId(userId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        personalOwnerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!workspace) {
      throw new InternalServerErrorException(
        'Personal workspace is unavailable.',
      );
    }

    return workspace.id;
  }

  private normalizeTagNames(tagNames: readonly string[]): NormalizedTag[] {
    if (tagNames.length > MAX_TAGS_PER_COCKTAIL) {
      throw new BadRequestException('Too many tags were provided.');
    }

    const tagsBySlug = new Map<string, NormalizedTag>();

    for (const rawName of tagNames) {
      const name = rawName.trim();

      if (name.length === 0 || name.length > MAX_TAG_NAME_LENGTH) {
        throw new BadRequestException('Tag name is invalid.');
      }

      const slug = toSlug(name);

      if (!slug) {
        throw new BadRequestException(
          'Tag name must contain letters or numbers.',
        );
      }

      if (!tagsBySlug.has(slug)) {
        tagsBySlug.set(slug, {
          name,
          slug,
        });
      }
    }

    return [...tagsBySlug.values()];
  }
}
