import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GenerateRecipesDto, ModifyRecipeDto, FavoriteDto } from './dto/recipe.dto';

@ApiTags('Recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate 3+ AI recipes from ingredients and preferences' })
  generate(@CurrentUser('userId') userId: string, @Body() dto: GenerateRecipesDto) {
    return this.recipesService.generate(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List recipes (optionally filter by favorites or cuisine)' })
  findAll(
    @CurrentUser('userId') userId: string,
    @Query('favorites') favorites?: string,
    @Query('cuisine') cuisine?: string,
  ) {
    return this.recipesService.findAll(userId, {
      favorites: favorites === 'true',
      cuisine,
    });
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized recipe recommendations' })
  recommendations(@CurrentUser('userId') userId: string) {
    return this.recipesService.getRecommendations(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single recipe by id' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.recipesService.findOne(id, userId);
  }

  @Post(':id/modify')
  @ApiOperation({ summary: 'Modify a recipe via natural language instruction' })
  modify(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() dto: ModifyRecipeDto) {
    return this.recipesService.modify(id, userId, dto);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Toggle favorite status on a recipe' })
  favorite(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() dto: FavoriteDto) {
    return this.recipesService.setFavorite(id, userId, dto.isFavorite);
  }

  @Post(':id/substitute')
  @ApiOperation({ summary: 'Substitute an ingredient in a recipe' })
  substitute(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('ingredient') ingredient: string,
  ) {
    return this.recipesService.substituteIngredient(id, userId, ingredient);
  }

  @Post(':id/grocery')
  @ApiOperation({ summary: 'Generate a grocery list from this recipe (missing items vs pantry)' })
  generateGrocery(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.recipesService.generateGroceryFromRecipe(id, userId);
  }
}
