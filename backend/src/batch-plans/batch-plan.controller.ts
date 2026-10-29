import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { BrowseWorkspacesDto } from '../workspaces/workspace.dto';
import {
  CreateBatchPlanDto,
  PreviewRecipeBatchDto,
  PreviewSavedBatchDto,
  UpdateBatchPlanDto,
} from './batch-plan.dto';
import { BatchPlanService } from './batch-plan.service';
@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class BatchPlanController {
  constructor(private readonly plans: BatchPlanService) {}
  @Get('batch-plans') list(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Query() q: BrowseWorkspacesDto,
  ) {
    return this.plans.list(u, w, q);
  }
  @Post('batch-plans/preview') preview(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Body() dto: PreviewRecipeBatchDto,
  ) {
    return this.plans.previewRecipe(u, w, dto);
  }
  @Post('batch-plans') create(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Body() dto: CreateBatchPlanDto,
  ) {
    return this.plans.create(u, w, dto);
  }
  @Get('batch-plan-receipts/:key') receipt(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Param('key', ParseUUIDPipe) key: string,
  ) {
    return this.plans.receipt(u, w, key);
  }
  @Get('batch-plans/:id') detail(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plans.detail(u, w, id);
  }
  @Post('batch-plans/:id/preview') previewSaved(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewSavedBatchDto,
  ) {
    return this.plans.previewSaved(u, w, id, dto);
  }
  @Put('batch-plans/:id') update(
    @CurrentUserId() u: string,
    @Param('workspaceId', ParseUUIDPipe) w: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchPlanDto,
  ) {
    return this.plans.update(u, w, id, dto);
  }
}
