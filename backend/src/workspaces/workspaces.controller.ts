import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { WorkspaceMembershipService } from './workspace-membership.service';
import {
  AddWorkspaceMemberDto,
  BrowseWorkspacesDto,
  WorkspaceVersionDto,
} from './workspace.dto';

@Controller('workspaces')
@UseGuards(SessionGuard)
export class WorkspacesController {
  constructor(private readonly memberships: WorkspaceMembershipService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: BrowseWorkspacesDto) {
    return this.memberships.list(userId, query);
  }

  @Get(':id')
  context(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.memberships.context(userId, id);
  }

  @Get(':id/members')
  members(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BrowseWorkspacesDto,
  ) {
    return this.memberships.members(userId, id, query);
  }

  @Post(':id/members')
  @HttpCode(200)
  add(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.memberships.add(userId, id, dto);
  }

  @Post(':id/members/:userId/revoke')
  @HttpCode(200)
  revoke(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) target: string,
    @Body() dto: WorkspaceVersionDto,
  ) {
    return this.memberships.revoke(userId, id, target, dto);
  }
}
