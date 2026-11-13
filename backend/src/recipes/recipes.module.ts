import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Recipe, RecipeSchema } from './schemas/recipe.schema';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { PantryModule } from '../pantry/pantry.module';
import { GroceryModule } from '../grocery/grocery.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Recipe.name, schema: RecipeSchema }]),
    PantryModule,
    GroceryModule,
    UsersModule,
  ],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
