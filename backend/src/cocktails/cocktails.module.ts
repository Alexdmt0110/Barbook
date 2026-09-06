import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { CocktailCreationService } from './cocktail-creation.service';
import { CocktailsController } from './cocktails.controller';
import { CocktailsService } from './cocktails.service';
import { CocktailOrganizationController } from './organization/cocktail-organization.controller';
import { CocktailOrganizationService } from './organization/cocktail-organization.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CocktailsController, CocktailOrganizationController],
  providers: [
    CocktailsService,
    CocktailCreationService,
    CocktailOrganizationService,
  ],
})
export class CocktailsModule {}
