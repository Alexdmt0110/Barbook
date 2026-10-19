import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { toSlug } from '../../common/slug';
import { lockOrganizationWorkspace } from '../../database/lock-organization-workspace';
import { PrismaService } from '../../database/prisma.service';
import {
  CocktailOrganizationResult,
  CocktailOrganizationTag,
} from './cocktail-organization.types';
import { UpdateCocktailOrganizationDto } from './dto/update-cocktail-organization.dto';

interface NormalizedTag {
  name: string;
  slug: string;
}

const MAX_TAGS_PER_COCKTAIL = 20;
const MAX_TAG_NAME_LENGTH = 40;

@Injectable()
export class CocktailOrganizationService {
  constructor(private readonly prisma: PrismaService) {}

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

    const isMultiple = dto.folderIds !== undefined;
    if (
      (isMultiple && dto.folderId !== undefined) ||
      (!isMultiple && dto.folderId === undefined) ||
      (isMultiple && dto.expectedVersion === undefined)
    ) {
      throw new BadRequestException(
        'Provide folderIds with expectedVersion, or a legacy folderId.',
      );
    }
    const folderIds = [
      ...new Set(
        (isMultiple ? dto.folderIds! : dto.folderId ? [dto.folderId] : []).map(
          (id) => id.toLowerCase(),
        ),
      ),
    ];
    const normalizedTags = this.normalizeTagNames(dto.tagNames);

    return this.prisma.$transaction(async (transaction) => {
      await lockOrganizationWorkspace(transaction, workspaceId);
      const cocktail = await transaction.cocktail.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: cocktailSlug,
          },
        },
        select: {
          id: true,
          folderId: true,
          organizationVersion: true,
          _count: { select: { folderMemberships: true } },
        },
      });

      if (!cocktail) {
        throw new NotFoundException('Cocktail not found.');
      }

      if (
        (dto.expectedVersion !== undefined &&
          dto.expectedVersion !== cocktail.organizationVersion) ||
        (!isMultiple && cocktail._count.folderMemberships > 1)
      ) {
        throw new ConflictException(
          'Organization has changed. Reload it before saving.',
        );
      }

      const folders =
        folderIds.length === 0
          ? []
          : await transaction.folder.findMany({
              where: { workspaceId, id: { in: folderIds } },
              orderBy: { id: 'asc' },
              select: { id: true, name: true },
            });
      if (folders.length !== folderIds.length) {
        throw new BadRequestException('Folder is unavailable.');
      }
      const folder =
        folders.find((item) => item.id === cocktail.folderId) ??
        folders[0] ??
        null;

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

      // The workspace lock serializes link mutations; the version protects stale drafts.
      const updated = await transaction.cocktail.update({
        where: {
          workspaceId_id: {
            workspaceId,
            id: cocktail.id,
          },
        },
        data: {
          folderId: folder?.id ?? null,
          organizationVersion: { increment: 1 },
        },
        select: { organizationVersion: true },
      });

      await transaction.cocktailFolder.deleteMany({
        where: {
          workspaceId,
          cocktailId: cocktail.id,
        },
      });

      if (folders.length > 0) {
        await transaction.cocktailFolder.createMany({
          data: folders.map((item) => ({
            workspaceId,
            cocktailId: cocktail.id,
            folderId: item.id,
          })),
        });
      }

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
        folders,
        organizationVersion: updated.organizationVersion,
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
