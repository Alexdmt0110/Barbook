import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { CocktailCreationService } from './cocktail-creation.service';
import { CocktailsController } from './cocktails.controller';
import { CocktailsService } from './cocktails.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CocktailsController],
  providers: [CocktailsService, CocktailCreationService],
})
export class CocktailsModule {}
