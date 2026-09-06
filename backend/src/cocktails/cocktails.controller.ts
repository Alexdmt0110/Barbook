import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CocktailCreationService } from './cocktail-creation.service';
import {
  CocktailDetail,
  CocktailListResult,
  CreateCocktailResult,
} from './cocktail.types';
import { CocktailsService } from './cocktails.service';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { ListCocktailsQueryDto } from './dto/list-cocktails-query.dto';

@Controller('cocktails')
@UseGuards(JwtAuthGuard)
export class CocktailsController {
  constructor(
    private readonly cocktailsService: CocktailsService,
    private readonly cocktailCreationService: CocktailCreationService,
  ) {}

  @Post()
  async createPersonalCocktail(
    @CurrentUserId() userId: string,
    @Body() dto: CreateCocktailDto,
  ): Promise<CreateCocktailResult> {
    return this.cocktailCreationService.createPersonalCocktail(userId, dto);
  }

  @Get()
  async findPersonalCocktails(
    @CurrentUserId() userId: string,
    @Query() query: ListCocktailsQueryDto,
  ): Promise<CocktailListResult> {
    return this.cocktailsService.findPersonalCocktails(userId, query);
  }

  @Get(':slug')
  async findPersonalCocktail(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
  ): Promise<CocktailDetail> {
    return this.cocktailsService.findPersonalCocktail(userId, slug);
  }
}
