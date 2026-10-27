import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SharedCocktailContentController } from './shared-cocktail-content.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { FoldersController } from '../folders/folders.controller';
import { FoldersService } from '../folders/folders.service';
import { CocktailCreationService } from './cocktail-creation.service';
import { CocktailContentService } from './cocktail-content.service';
import { CocktailLifecycleService } from './cocktail-lifecycle.service';
import { CocktailLifecycleController } from './cocktail-lifecycle.controller';
import { CocktailsController } from './cocktails.controller';
import { CocktailsService } from './cocktails.service';
import { CocktailOrganizationController } from './organization/cocktail-organization.controller';
import { CocktailOrganizationService } from './organization/cocktail-organization.service';

@Module({
  imports: [AuthModule, PrismaModule, WorkspacesModule],
  controllers: [
    SharedCocktailContentController,
    CocktailLifecycleController,
    CocktailsController,
    CocktailOrganizationController,
    FoldersController,
  ],
  providers: [
    CocktailLifecycleService,
    FoldersService,
    CocktailsService,
    CocktailCreationService,
    CocktailContentService,
    CocktailOrganizationService,
  ],
})
export class CocktailsModule {}
