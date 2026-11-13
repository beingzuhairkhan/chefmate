import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class TranscribeDto {
  @ApiProperty({ description: 'Base64-encoded audio' })
  @IsString()
  audio: string;

  @ApiPropertyOptional({ example: 'en-IN' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class RespondDto {
  @ApiProperty({ example: 'Suggest a healthy breakfast' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ example: 'en-IN' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class SpeakDto {
  @ApiProperty({ example: 'Here is your recipe.' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ example: 'en-IN' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class StartCookingDto {
  @ApiProperty()
  @IsString()
  recipeId: string;
}

export class UpdateCookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  currentStep?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
