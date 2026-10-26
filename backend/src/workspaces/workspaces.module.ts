import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspaceMembershipService } from './workspace-membership.service';
import { WorkspacesController } from './workspaces.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [WorkspaceAccessService, WorkspaceMembershipService],
  controllers: [WorkspacesController],
  exports: [WorkspaceAccessService],
})
export class WorkspacesModule {}
