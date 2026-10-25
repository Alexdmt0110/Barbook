import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { CocktailLifecycleService } from './cocktail-lifecycle.service';
import {
  CocktailLifecycleDto,
  ListTrashDto,
} from './dto/cocktail-lifecycle.dto';

@Controller('cocktails')
@UseGuards(SessionGuard)
export class CocktailLifecycleController {
  constructor(private readonly lifecycle: CocktailLifecycleService) {}

  @Get('trash/entries')
  list(@CurrentUserId() userId: string, @Query() query: ListTrashDto) {
    return this.lifecycle.list(userId, query);
  }

  @Get('id/:id/lifecycle')
  get(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycle.get(userId, id.toLowerCase());
  }

  @Delete('id/:id')
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CocktailLifecycleDto,
  ) {
    return this.lifecycle.transition(userId, id.toLowerCase(), dto, false);
  }

  @Post('id/:id/restore')
  @HttpCode(200)
  restore(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CocktailLifecycleDto,
  ) {
    return this.lifecycle.transition(userId, id.toLowerCase(), dto, true);
  }
}
