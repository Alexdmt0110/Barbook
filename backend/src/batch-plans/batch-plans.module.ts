import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CocktailsModule } from '../cocktails/cocktails.module';
import { PrismaModule } from '../database/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BatchPlanController } from './batch-plan.controller';
import { BatchPlanService } from './batch-plan.service';
@Module({
  imports: [AuthModule, PrismaModule, WorkspacesModule, CocktailsModule],
  controllers: [BatchPlanController],
  providers: [BatchPlanService],
})
export class BatchPlansModule {}
