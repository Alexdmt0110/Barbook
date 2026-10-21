import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { CreateFolderDto } from './dto/create-folder.dto';
import {
  AddFolderCocktailsDto,
  BrowseFoldersDto,
  DeleteFolderQueryDto,
  RenameFolderDto,
} from './dto/folder-commands.dto';
import { FoldersService } from './folders.service';

@Controller('folders')
@UseGuards(SessionGuard)
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}
  @Get()
  list(@CurrentUserId() userId: string) {
    return this.folders.listPersonalFolders(userId);
  }
  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateFolderDto) {
    return this.folders.createPersonalFolder(userId, dto);
  }
  @Get('browse')
  browse(@CurrentUserId() userId: string, @Query() query: BrowseFoldersDto) {
    return this.folders.browse(userId, query);
  }
  @Get(':id')
  detail(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.folders.detail(userId, id.toLowerCase());
  }
  @Patch(':id')
  rename(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameFolderDto,
  ) {
    return this.folders.rename(userId, id.toLowerCase(), dto);
  }
  @Delete(':id')
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteFolderQueryDto,
  ) {
    return this.folders.remove(userId, id.toLowerCase(), query.expectedVersion);
  }
  @Post(':id/cocktails')
  @HttpCode(200)
  add(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFolderCocktailsDto,
  ) {
    return this.folders.addCocktails(userId, id.toLowerCase(), dto.cocktailIds);
  }
  @Put(':id/cocktails/:cocktailId')
  addOne(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('cocktailId', ParseUUIDPipe) cocktailId: string,
  ) {
    return this.folders.addCocktails(userId, id.toLowerCase(), [
      cocktailId.toLowerCase(),
    ]);
  }
  @Delete(':id/cocktails/:cocktailId')
  removeOne(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('cocktailId', ParseUUIDPipe) cocktailId: string,
  ) {
    return this.folders.removeCocktail(
      userId,
      id.toLowerCase(),
      cocktailId.toLowerCase(),
    );
  }
}
