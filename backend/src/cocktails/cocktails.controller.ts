import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CocktailDetail, CocktailSummary } from './cocktail.types';
import { CocktailsService } from './cocktails.service';

@Controller('cocktails')
@UseGuards(JwtAuthGuard)
export class CocktailsController {
  constructor(private readonly cocktailsService: CocktailsService) {}

  @Get()
  async findPersonalCocktails(
    @CurrentUserId() userId: string,
  ): Promise<CocktailSummary[]> {
    return this.cocktailsService.findPersonalCocktails(userId);
  }

  @Get(':slug')
  async findPersonalCocktail(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
  ): Promise<CocktailDetail> {
    return this.cocktailsService.findPersonalCocktail(userId, slug);
  }
}
