import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class AnalyzeNutritionDto {
  @ApiProperty({ example: 'Paneer Tomato Masala' })
  @IsString()
  recipeTitle: string;

  @ApiProperty({ type: 'array', example: [{ name: 'Paneer', quantity: 250, unit: 'g' }] })
  @IsArray()
  ingredients: Array<{ name: string; quantity: number; unit: string }>;

  @ApiProperty({ example: 2 })
  @IsNumber()
  servings: number;

  @ApiPropertyOptional({ example: 'recipeId' })
  @IsOptional()
  @IsString()
  recipeId?: string;
}
