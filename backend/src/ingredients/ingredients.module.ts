import { SharedIngredientsController } from './shared-ingredients.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({
  imports: [AuthModule, PrismaModule, WorkspacesModule],
  controllers: [IngredientsController, SharedIngredientsController],
  providers: [IngredientsService],
})
export class IngredientsModule {}
