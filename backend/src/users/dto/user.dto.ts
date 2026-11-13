import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 'Vegetarian' })
  @IsOptional()
  @IsString()
  dietaryPreference?: string;

  @ApiPropertyOptional({ type: [String], example: ['peanuts', 'shellfish'] })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Indian', 'Italian'] })
  @IsOptional()
  @IsArray()
  favoriteCuisines?: string[];

  @ApiPropertyOptional({ example: 'Intermediate' })
  @IsOptional()
  @IsString()
  cookingExperience?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  householdSize?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  weeklyBudget?: number;

  @ApiPropertyOptional({ example: '30 min' })
  @IsOptional()
  @IsString()
  cookingTimePreference?: string;

  @ApiPropertyOptional({ example: 'Balanced' })
  @IsOptional()
  @IsString()
  nutritionPreference?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'hi-IN' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: 'ExpoPushToken[...]' })
  @IsOptional()
  @IsString()
  notificationToken?: string;

  @ApiPropertyOptional({ type: UpdatePreferencesDto })
  @IsOptional()
  preferences?: UpdatePreferencesDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  dietaryRestrictions?: string[];
}
