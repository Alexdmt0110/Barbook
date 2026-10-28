import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CocktailCreationService } from './cocktail-creation.service';
import { CocktailsService } from './cocktails.service';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { ListCocktailsQueryDto } from './dto/list-cocktails-query.dto';

export class CreateSharedCocktailDto extends CreateCocktailDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedAccessVersion?: number | null;
}

@Controller('workspaces/:workspaceId/cocktails')
@UseGuards(SessionGuard)
export class SharedCocktailsController {
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly recipes: CocktailsService,
    private readonly creation: CocktailCreationService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListCocktailsQueryDto,
  ) {
    return this.access.shared(userId, workspaceId, async (tx, context) => ({
      ...(await this.recipes.findInWorkspace(tx, workspaceId, query)),
      accessVersion: context.accessVersion,
    }));
  }

  @Get(':slug')
  detail(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('slug') slug: string,
  ) {
    return this.access.shared(userId, workspaceId, async (tx, context) => ({
      ...(await this.recipes.findDetailInWorkspace(tx, workspaceId, slug)),
      accessVersion: context.accessVersion,
    }));
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateSharedCocktailDto,
  ) {
    return this.access.shared(
      userId,
      workspaceId,
      async (tx, context) => ({
        ...(await this.creation.createInWorkspace(tx, workspaceId, dto)),
        accessVersion: context.accessVersion,
      }),
      { expectedAccessVersion: dto.expectedAccessVersion },
    );
  }
}
