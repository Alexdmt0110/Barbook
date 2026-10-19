import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CocktailOrganizationService } from './cocktail-organization.service';
import {
  CocktailOrganizationResult,
  CocktailOrganizationTag,
} from './cocktail-organization.types';
import { UpdateCocktailOrganizationDto } from './dto/update-cocktail-organization.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CocktailOrganizationController {
  constructor(
    private readonly organizationService: CocktailOrganizationService,
  ) {}

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
