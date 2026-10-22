import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { CocktailCreationService } from './cocktail-creation.service';
import {
  CocktailDetail,
  CocktailListResult,
  CreateCocktailResult,
} from './cocktail.types';
import { CocktailsService } from './cocktails.service';
import { CreateCocktailDto } from './dto/create-cocktail.dto';
import { ListCocktailsQueryDto } from './dto/list-cocktails-query.dto';
import { CocktailContentService } from './cocktail-content.service';
import { ReplaceCocktailContentDto } from './dto/replace-cocktail-content.dto';

@Controller('cocktails')
@UseGuards(SessionGuard)
export class CocktailsController {
  constructor(
    private readonly cocktailsService: CocktailsService,
    private readonly cocktailCreationService: CocktailCreationService,
    private readonly contentService: CocktailContentService,
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

  @Get('id/:id/content')
  content(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contentService.get(userId, id.toLowerCase());
  }

  @Put('id/:id/content')
  replaceContent(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceCocktailContentDto,
  ) {
    return this.contentService.replace(userId, id.toLowerCase(), dto);
  }
}
