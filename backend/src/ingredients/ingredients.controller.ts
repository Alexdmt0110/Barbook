import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IngredientSuggestion } from './ingredient.types';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
@UseGuards(JwtAuthGuard)
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  async searchPersonalIngredients(
    @CurrentUserId()
    userId: string,

    @Query('query')
    query: string | undefined,
  ): Promise<IngredientSuggestion[]> {
    return this.ingredientsService.searchPersonalIngredients(
      userId,
      query ?? '',
    );
  }
}
