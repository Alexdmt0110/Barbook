import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import {
  BrowseInventoryDto,
  CreateStockMovementDto,
  CreateStockProductDto,
  UpdateStockSettingsDto,
} from './inventory.dto';
import { InventoryService } from './inventory.service';
@Controller('workspaces/:workspaceId/inventory')
@UseGuards(SessionGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get('products') list(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Query() query: BrowseInventoryDto,
  ) {
    return this.inventory.list(user, workspace, query);
  }
  @Get('reorder') reorder(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Query() query: BrowseInventoryDto,
  ) {
    return this.inventory.list(user, workspace, query, true);
  }
  @Get('receipts/:requestId') receipt(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Param('requestId', ParseUUIDPipe) request: string,
  ) {
    return this.inventory.receipt(user, workspace, request);
  }
  @Post('products') create(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Body() dto: CreateStockProductDto,
  ) {
    return this.inventory.create(user, workspace, dto);
  }
  @Get('products/:productId') detail(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Param('productId', ParseUUIDPipe) product: string,
  ) {
    return this.inventory.detail(user, workspace, product);
  }
  @Put('products/:productId') settings(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Param('productId', ParseUUIDPipe) product: string,
    @Body() dto: UpdateStockSettingsDto,
  ) {
    return this.inventory.settings(user, workspace, product, dto);
  }
  @Get('products/:productId/movements') history(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Param('productId', ParseUUIDPipe) product: string,
    @Query() query: BrowseInventoryDto,
  ) {
    return this.inventory.history(user, workspace, product, query);
  }
  @Post('products/:productId/movements') move(
    @CurrentUserId() user: string,
    @Param('workspaceId', ParseUUIDPipe) workspace: string,
    @Param('productId', ParseUUIDPipe) product: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.inventory.move(user, workspace, product, dto);
  }
}
