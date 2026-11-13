import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { GroceryService } from '../grocery/grocery.service';
import { PantryService } from '../pantry/pantry.service';
import { RecipeAgent } from '../ai/agents/recipe-agent';
import { Recipe } from './schemas/recipe.schema';
import { RecipesService } from './recipes.service';
import { UsersService } from '../users/users.service';

describe('RecipesService.modify', () => {
  it('normalizes AI nutrition values that include units before saving', async () => {
    const recipeId = '507f191e810c19729de860ea';
    const userId = '507f1f77bcf86cd799439011';
    const recipe = {
      _id: recipeId,
      title: 'Tomato Curry',
      description: 'Original recipe',
      ingredients: [{ name: 'Tomatoes', quantity: 2, unit: 'pcs' }],
      instructions: [{ step: 1, text: 'Cook the tomatoes' }],
      prepTime: 10,
      cookingTime: 20,
      servings: 2,
      difficulty: 'Easy',
      nutrition: { calories: 100, protein: 5, carbs: 10, fat: 4, fiber: 2 },
    };
    const findOneExec = jest.fn().mockResolvedValue(recipe);
    const findByIdAndUpdate = jest.fn().mockResolvedValue(recipe);
    const recipeAgent = {
      modifyRecipe: jest.fn().mockResolvedValue({
        nutrition: { calories: '200 kcal', protein: '14 g', carbs: '25 g', fat: '8 g', fiber: '4 g' },
        prepTime: '15 minutes',
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: getModelToken(Recipe.name), useValue: {
          findOne: jest.fn().mockReturnValue({ exec: findOneExec }),
          findByIdAndUpdate,
        } },
        { provide: RecipeAgent, useValue: recipeAgent },
        { provide: PantryService, useValue: {} },
        { provide: GroceryService, useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    try {
      const service = moduleRef.get(RecipesService);
      await service.modify(recipeId, userId, { instruction: 'Make it lighter' });

      expect(findByIdAndUpdate).toHaveBeenCalledWith(
        recipeId,
        { $set: {
          prepTime: 15,
          nutrition: { calories: 200, protein: 14, carbs: 25, fat: 8, fiber: 4 },
        } },
        { new: true },
      );
    } finally {
      await moduleRef.close();
    }
  });
});
