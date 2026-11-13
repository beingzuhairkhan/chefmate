import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { RecipesModule } from '../recipes/recipes.module';

@Module({
  imports: [RecipesModule],
  controllers: [NutritionController],
})
export class NutritionModule {}
