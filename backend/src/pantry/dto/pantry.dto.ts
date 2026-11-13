import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreatePantryItemDto {
  @ApiProperty({ example: 'Tomatoes' })
  @IsString()
  name: string;

  @ApiProperty({ example: 4 })
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

  @ApiPropertyOptional({ example: '2026-11-20T00:00:00.000Z' })
  @IsOptional()
  expiryDate?: string;
}

export class UpdatePantryItemDto {
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
  expiryDate?: string;
}

export class ScanResultDto {
  @ApiProperty({ type: 'array' })
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    confidence: number;
    estimatedExpiryDays?: number;
  }>;
  demoMode: boolean;
}

export class ConfirmScanDto {
  @ApiProperty({ type: 'array' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePantryItemDto)
  ingredients: CreatePantryItemDto[];
}
