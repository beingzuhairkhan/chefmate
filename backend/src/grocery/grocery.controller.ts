import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GroceryService } from './grocery.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddGroceryItemDto, UpdateGroceryItemDto, GenerateGroceryDto } from './dto/grocery.dto';

@ApiTags('Grocery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('grocery')
export class GroceryController {
  constructor(private readonly groceryService: GroceryService) {}

  @Get()
  @ApiOperation({ summary: 'Get the active grocery list for the current user' })
  findActive(@CurrentUser('userId') userId: string) {
    return this.groceryService.findActive(userId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get shopping progress summary' })
  progress(@CurrentUser('userId') userId: string) {
    return this.groceryService.getProgress(userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all grocery lists (history)' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.groceryService.findAll(userId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a grocery list from a recipe or meal plan (diffs against pantry)' })
  generate(@CurrentUser('userId') userId: string, @Body() dto: GenerateGroceryDto) {
    // The actual recipe/meal-plan resolution is done by the calling module.
    // This endpoint is also called internally; here we return the active list.
    return this.groceryService.findActive(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a custom item to the grocery list' })
  addItem(@CurrentUser('userId') userId: string, @Body() dto: AddGroceryItemDto) {
    return this.groceryService.addItem(userId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a grocery item (quantity, purchased, etc.)' })
  updateItem(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateGroceryItemDto,
  ) {
    return this.groceryService.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove a grocery item' })
  removeItem(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.groceryService.removeItem(userId, id);
  }
}
