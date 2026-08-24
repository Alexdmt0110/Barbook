import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CocktailSummary } from './cocktail.types';
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
}
