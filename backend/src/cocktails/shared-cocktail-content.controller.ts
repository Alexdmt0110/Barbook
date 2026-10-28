import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CocktailContentService } from './cocktail-content.service';
import { ReplaceCocktailContentDto } from './dto/replace-cocktail-content.dto';

export class ReplaceSharedContentDto extends ReplaceCocktailContentDto {
  @ValidateIf((_object, value: unknown) => value != null)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  expectedAccessVersion?: number | null;
}

@Controller('workspaces/:workspaceId/cocktails/id/:id/content')
@UseGuards(SessionGuard)
export class SharedCocktailContentController {
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly content: CocktailContentService,
  ) {}

  @Get()
  get(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.shared(userId, workspaceId, async (tx, context) => ({
      ...(await this.content.getInWorkspace(tx, workspaceId, id)),
      accessVersion: context.accessVersion,
    }));
  }

  @Put()
  replace(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceSharedContentDto,
  ) {
    return this.access.shared(
      userId,
      workspaceId,
      async (tx, context) => ({
        ...(await this.content.replaceInWorkspace(tx, workspaceId, id, dto)),
        accessVersion: context.accessVersion,
      }),
      { expectedAccessVersion: dto.expectedAccessVersion },
    );
  }
}
