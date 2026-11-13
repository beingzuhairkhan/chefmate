import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NutritionAgent } from '../ai/agents/nutrition-agent';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyzeNutritionDto } from './dto/nutrition.dto';
import { RecipesService } from '../recipes/recipes.service';

@ApiTags('Nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly nutritionAgent: NutritionAgent,
    private readonly recipesService: RecipesService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze nutrition for a recipe (by ingredients or recipe id)' })
  async analyze(@CurrentUser('userId') userId: string, @Body() dto: AnalyzeNutritionDto) {
    let input = { recipeTitle: dto.recipeTitle, ingredients: dto.ingredients, servings: dto.servings };
    if (dto.recipeId) {
      const recipe = await this.recipesService.findOne(dto.recipeId, userId);
      input = {
        recipeTitle: recipe.title,
        ingredients: recipe.ingredients.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
        servings: recipe.servings,
      };
    }
    const result = await this.nutritionAgent.analyzeNutrition(input);
    return { ...result, isEstimate: true, demoMode: !this.nutritionAgent.isConfigured() };
  }

  @Get('recipe/:id')
  @ApiOperation({ summary: 'Get nutrition for a saved recipe' })
  async recipeNutrition(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    const recipe = await this.recipesService.findOne(id, userId);
    return {
      ...recipe.nutrition,
      isEstimate: true,
      recipeTitle: recipe.title,
      servings: recipe.servings,
      demoMode: !this.nutritionAgent.isConfigured(),
    };
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Daily nutrition summary from today\'s meals' })
  async dailySummary(@CurrentUser('userId') userId: string) {
    const recipes = await this.recipesService.findAll(userId);
    const today = recipes.slice(0, 3).map((r) => ({
      title: r.title,
      calories: r.nutrition?.calories || 0,
      protein: r.nutrition?.protein || 0,
      carbs: r.nutrition?.carbs || 0,
      fat: r.nutrition?.fat || 0,
    }));
    return this.nutritionAgent.dailySummary(today);
  }
}
