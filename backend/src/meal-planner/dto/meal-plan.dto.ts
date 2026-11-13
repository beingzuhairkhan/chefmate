import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateMealPlanDto {
  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: 'Vegetarian' })
  @IsOptional()
  @IsString()
  dietaryPreference?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  householdSize?: number;

  @ApiPropertyOptional({ type: [String], example: ['Tomatoes', 'Paneer'] })
  @IsOptional()
  @IsArray()
  availableIngredients?: string[];

  @ApiPropertyOptional({ example: 'Balanced' })
  @IsOptional()
  @IsString()
  nutritionPreference?: string;
}

export class UpdateMealPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  days?: Array<{
    day: string;
    meals: Array<{ type: string; recipeTitle?: string; recipeId?: string; description?: string }>;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  budget?: number;
}
