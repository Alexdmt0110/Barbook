import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { SearchIngredientsQueryDto } from './dto/search-ingredients-query.dto';
import { IngredientSuggestion } from './ingredient.types';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
@UseGuards(SessionGuard)
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  async searchPersonalIngredients(
    @CurrentUserId()
    userId: string,

    @Query()
    query: SearchIngredientsQueryDto,
  ): Promise<IngredientSuggestion[]> {
    return this.ingredientsService.searchPersonalIngredients(
      userId,
      query.query ?? '',
    );
  }
}
