import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';
import { GenerateRecipesDto, ModifyRecipeDto } from './dto/recipe.dto';
import { RecipeAgent, GenerateRecipesInput } from '../ai/agents/recipe-agent';
import { PantryService } from '../pantry/pantry.service';
import { GroceryService } from '../grocery/grocery.service';
import { UsersService } from '../users/users.service';

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseFloat(value)
      : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
    private readonly recipeAgent: RecipeAgent,
    private readonly pantryService: PantryService,
    private readonly groceryService: GroceryService,
    private readonly usersService: UsersService,
  ) {}

  async generate(userId: string, dto: GenerateRecipesDto) {
    const generated = await this.recipeAgent.generateRecipes({
      ingredients: dto.ingredients,
      cuisine: dto.cuisine,
      dietaryPreference: dto.dietaryPreference,
      cookingTime: dto.cookingTime,
      difficulty: dto.difficulty,
      budget: dto.budget,
      servings: dto.servings,
    });

    const saved = await Promise.all(
      generated.map((r) =>
        this.recipeModel.create({
          userId: new Types.ObjectId(userId),
          title: r.title,
          description: r.description,
          ingredients: r.ingredients,
          missingIngredients: r.missingIngredients || [],
          instructions: r.instructions,
          prepTime: r.prepTime,
          cookingTime: r.cookingTime,
          servings: r.servings,
          difficulty: r.difficulty,
          nutrition: r.nutrition,
          image: r.image,
          cuisine: r.cuisine,
          isAIGenerated: true,
        }),
      ),
    );

    return { recipes: saved, demoMode: !this.recipeAgent.isConfigured() };
  }

  async findAll(userId: string, query?: { favorites?: boolean; cuisine?: string }) {
    const q: Record<string, any> = { userId: new Types.ObjectId(userId) };
    if (query?.favorites) q.isFavorite = true;
    if (query?.cuisine) q.cuisine = query.cuisine;
    return this.recipeModel.find(q).sort({ createdAt: -1 }).limit(50).exec();
  }

  async findOne(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Recipe not found');
    const recipe = await this.recipeModel.findOne({ _id: id, userId: new Types.ObjectId(userId) }).exec();
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  async modify(id: string, userId: string, dto: ModifyRecipeDto) {
    const recipe = await this.findOne(id, userId);
    const modified = await this.recipeAgent.modifyRecipe({
      recipeId: id,
      instruction: dto.instruction,
      currentRecipe: {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
        instructions: recipe.instructions.map((i: any) => ({ step: i.step, text: i.text })),
      },
    });

    const updated = await this.recipeModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(modified.title && { title: modified.title }),
          ...(modified.description && { description: modified.description }),
          ...(modified.ingredients && { ingredients: modified.ingredients }),
          ...(modified.instructions && { instructions: modified.instructions }),
          ...(modified.prepTime !== undefined && { prepTime: finiteNumber(modified.prepTime, recipe.prepTime) }),
          ...(modified.cookingTime !== undefined && { cookingTime: finiteNumber(modified.cookingTime, recipe.cookingTime) }),
          ...(modified.servings !== undefined && { servings: finiteNumber(modified.servings, recipe.servings) }),
          ...(modified.difficulty && { difficulty: modified.difficulty }),
          ...(modified.nutrition && {
            nutrition: {
              calories: finiteNumber(modified.nutrition.calories, recipe.nutrition?.calories ?? 0),
              protein: finiteNumber(modified.nutrition.protein, recipe.nutrition?.protein ?? 0),
              carbs: finiteNumber(modified.nutrition.carbs, recipe.nutrition?.carbs ?? 0),
              fat: finiteNumber(modified.nutrition.fat, recipe.nutrition?.fat ?? 0),
              fiber: finiteNumber(modified.nutrition.fiber, recipe.nutrition?.fiber ?? 0),
            },
          }),
        },
      },
      { new: true },
    );
    return updated;
  }

  async setFavorite(id: string, userId: string, isFavorite: boolean) {
    const recipe = await this.recipeModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { isFavorite } },
      { new: true },
    );
    if (!recipe) throw new NotFoundException('Recipe not found');

    if (isFavorite) {
      await this.usersService.addFavoriteRecipe(userId, id);
    } else {
      await this.usersService.removeFavoriteRecipe(userId, id);
    }
    return recipe;
  }

  async substituteIngredient(id: string, userId: string, ingredientName: string) {
    const recipe = await this.findOne(id, userId);
    const result = await this.recipeAgent.substituteIngredient(
      recipe.ingredients.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
      ingredientName,
    );
    const updated = await this.recipeModel.findByIdAndUpdate(
      id,
      { $set: { ingredients: result.updatedIngredients } },
      { new: true },
    );
    return { substitution: result.substitution, recipe: updated };
  }

  async generateGroceryFromRecipe(id: string, userId: string) {
    const recipe = await this.findOne(id, userId);
    return this.groceryService.generateFromRecipe(userId, recipe);
  }

  async getRecommendations(userId: string) {
    const favorites = await this.recipeModel
      .find({ userId: new Types.ObjectId(userId), isFavorite: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();
    const recent = await this.recipeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();
    const pantryNames = await this.pantryService.getNames(userId);
    const user = await this.usersService.findById(userId);

    const cuisines = user?.preferences?.favoriteCuisines || [];
    const recommendations = [...favorites, ...recent].slice(0, 6);

    const explanations = recommendations.map((r) => {
      const reasons: string[] = [];
      if (cuisines.some((c: string) => r.cuisine?.toLowerCase().includes(c.toLowerCase()))) {
        reasons.push(`you enjoy ${r.cuisine} food`);
      }
      const matchedIngredients = r.ingredients.filter((i: any) =>
        pantryNames.some((p) => p.toLowerCase().includes(i.name.toLowerCase())),
      );
      if (matchedIngredients.length > 0) {
        reasons.push(`you have ${matchedIngredients[0].name} in your pantry`);
      }
      if (r.isFavorite) reasons.push('it matches your saved favorites');
      return { recipe: r, reason: reasons.length ? `Recommended because ${reasons.join(' and ')}.` : 'Based on your activity.' };
    });

    return { recommendations: explanations, pantryItems: pantryNames, demoMode: !this.recipeAgent.isConfigured() };
  }
}
