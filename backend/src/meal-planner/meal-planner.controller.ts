import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MealPlannerService } from './meal-planner.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GenerateMealPlanDto, UpdateMealPlanDto } from './dto/meal-plan.dto';

@ApiTags('Meal Planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meal-planner')
export class MealPlannerController {
  constructor(private readonly mealPlannerService: MealPlannerService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a 7-day AI meal plan' })
  generate(@CurrentUser('userId') userId: string, @Body() dto: GenerateMealPlanDto) {
    return this.mealPlannerService.generate(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the current week\'s meal plan' })
  findCurrent(@CurrentUser('userId') userId: string) {
    return this.mealPlannerService.findCurrent(userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'List all saved meal plans' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.mealPlannerService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific meal plan' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.mealPlannerService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meal plan (edit meals, regenerate day)' })
  update(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() dto: UpdateMealPlanDto) {
    return this.mealPlannerService.update(id, userId, dto);
  }

  @Post(':id/grocery')
  @ApiOperation({ summary: 'Generate a grocery list from this meal plan' })
  generateGrocery(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.mealPlannerService.generateGroceryFromPlan(userId, id);
  }

  @Post(':id/replace-meal')
  @ApiOperation({ summary: 'Replace a single meal in the plan' })
  replaceMeal(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('day') day: string,
    @Body('mealType') mealType: string,
    @Body('preferences') preferences: Record<string, any>,
  ) {
    return this.mealPlannerService.replaceMeal(userId, id, day, mealType, preferences || {});
  }
}
