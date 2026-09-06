import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CocktailOrganizationService } from './cocktail-organization.service';
import {
  CocktailOrganizationFolder,
  CocktailOrganizationResult,
  CocktailOrganizationTag,
} from './cocktail-organization.types';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateCocktailOrganizationDto } from './dto/update-cocktail-organization.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CocktailOrganizationController {
  constructor(
    private readonly organizationService: CocktailOrganizationService,
  ) {}

  @Get('folders')
  async listPersonalFolders(
    @CurrentUserId() userId: string,
  ): Promise<CocktailOrganizationFolder[]> {
    return this.organizationService.listPersonalFolders(userId);
  }

  @Post('folders')
  async createPersonalFolder(
    @CurrentUserId() userId: string,
    @Body() dto: CreateFolderDto,
  ): Promise<CocktailOrganizationFolder> {
    return this.organizationService.createPersonalFolder(userId, dto);
  }

  @Get('tags')
  async listPersonalTags(
    @CurrentUserId() userId: string,
  ): Promise<CocktailOrganizationTag[]> {
    return this.organizationService.listPersonalTags(userId);
  }

  @Put('cocktails/:slug/organization')
  async updatePersonalCocktailOrganization(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateCocktailOrganizationDto,
  ): Promise<CocktailOrganizationResult> {
    return this.organizationService.updatePersonalCocktailOrganization(
      userId,
      slug,
      dto,
    );
  }
}
