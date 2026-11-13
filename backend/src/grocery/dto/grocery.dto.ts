import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GroceryItemDto {
  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pcs' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ example: 'Vegetables' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;
}

export class AddGroceryItemDto extends GroceryItemDto {}

export class UpdateGroceryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  purchased?: boolean;
}

export class GenerateGroceryDto {
  @ApiPropertyOptional({ example: 'recipeId' })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiPropertyOptional({ example: 'mealPlanId' })
  @IsOptional()
  @IsString()
  mealPlanId?: string;
}
