import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class GenerateRecipesDto {
  @ApiProperty({ type: [String], example: ['Tomatoes', 'Onions', 'Paneer'] })
  @IsArray()
  ingredients: string[];

  @ApiPropertyOptional({ example: 'Indian' })
  @IsOptional()
  @IsString()
  cuisine?: string;

  @ApiPropertyOptional({ example: 'Vegetarian' })
  @IsOptional()
  @IsString()
  dietaryPreference?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  cookingTime?: number;

  @ApiPropertyOptional({ example: 'Easy' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  servings?: number;
}

export class ModifyRecipeDto {
  @ApiProperty({ example: 'Make this recipe dairy-free' })
  @IsString()
  instruction: string;
}

export class FavoriteDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isFavorite: boolean;
}

export class GeneratedRecipesResponseDto {
  @ApiProperty({ type: 'array' })
  recipes: any[];
  demoMode: boolean;
}
