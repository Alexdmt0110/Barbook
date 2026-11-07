import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { RecipeNameAvailabilityService } from './recipe-name-availability.service';
import { RecipeNameQuery } from './dto/recipe-name-query.dto';

@Controller('cocktail-name-availability')
@UseGuards(SessionGuard)
export class PersonalRecipeNameAvailabilityController {
  constructor(private readonly names: RecipeNameAvailabilityService) {}
  @Get() get(@CurrentUserId() userId: string, @Query() query: RecipeNameQuery) {
    return this.names.personal(userId, query);
  }
}

@Controller('workspaces/:workspaceId/cocktail-name-availability')
@UseGuards(SessionGuard)
export class SharedRecipeNameAvailabilityController {
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly names: RecipeNameAvailabilityService,
  ) {}
  @Get() get(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: RecipeNameQuery,
  ) {
    return this.access.shared(userId, workspaceId, (tx) =>
      this.names.inWorkspace(tx, workspaceId, query),
    );
  }
}
