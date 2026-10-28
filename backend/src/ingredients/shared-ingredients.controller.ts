import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { SearchIngredientsQueryDto } from './dto/search-ingredients-query.dto';
import { IngredientsService } from './ingredients.service';

@Controller('workspaces/:workspaceId/ingredients')
@UseGuards(SessionGuard)
export class SharedIngredientsController {
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly ingredients: IngredientsService,
  ) {}

  @Get()
  search(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: SearchIngredientsQueryDto,
  ) {
    return this.access.shared(userId, workspaceId, (tx) =>
      this.ingredients.searchInWorkspace(tx, workspaceId, query.query ?? ''),
    );
  }
}
