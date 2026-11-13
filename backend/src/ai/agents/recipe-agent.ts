import { Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini.service';

export interface GenerateRecipesInput {
  ingredients: string[];
  cuisine?: string;
  dietaryPreference?: string;
  cookingTime?: number;
  difficulty?: string;
  budget?: number;
  servings?: number;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  missingIngredients: string[];
  instructions: Array<{ step: number; text: string }>;
  prepTime: number;
  cookingTime: number;
  servings: number;
  difficulty: string;
  nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  image: string;
  cuisine: string;
}

export interface ModifyRecipeInput {
  recipeId: string;
  instruction: string;
  currentRecipe: {
    title: string;
    description: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    instructions: Array<{ step: number; text: string }>;
  };
}

@Injectable()
export class RecipeAgent {
  constructor(private readonly gemini: GeminiService) {}

  isConfigured() {
    return this.gemini.isConfigured();
  }

  async generateRecipes(input: GenerateRecipesInput): Promise<GeneratedRecipe[]> {
    if (!this.gemini.isConfigured()) {
      return this.demoRecipes(input);
    }
    const systemPrompt = `You are ChefMate AI, an expert recipe generator. Generate exactly 3 recipes as JSON. Each recipe object must have: title, description, ingredients (array of {name, quantity(number), unit}), missingIngredients (array of strings NOT in the provided list), instructions (array of {step(number), text}), prepTime(minutes number), cookingTime(minutes number), servings(number), difficulty, nutrition ({calories, protein, carbs, fat, fiber} numbers), image(unsplash URL string), cuisine.`;
    const prompt = `Generate 3 recipes with these constraints:
Ingredients available: ${input.ingredients.join(', ')}
Cuisine: ${input.cuisine || 'any'}
Dietary preference: ${input.dietaryPreference || 'none'}
Max cooking time: ${input.cookingTime || 60} minutes
Difficulty: ${input.difficulty || 'Easy'}
Budget: $${input.budget || 50}
Servings: ${input.servings || 2}

Return JSON: { "recipes": [ ...3 recipe objects... ] }`;

    const res = await this.gemini.generateJson<{ recipes: GeneratedRecipe[] }>(prompt, {
      systemPrompt,
      maxOutputTokens: 4096,
    });
    return res.recipes || [];
  }

  async modifyRecipe(input: ModifyRecipeInput): Promise<Partial<GeneratedRecipe>> {
    if (!this.gemini.isConfigured()) {
      return this.demoModify(input);
    }
    const prompt = `Modify this recipe based on the user's instruction. Return the FULL updated recipe as JSON.

Current recipe: ${JSON.stringify(input.currentRecipe)}
Instruction: "${input.instruction}"

Return JSON with: { title, description, ingredients, instructions, prepTime, cookingTime, servings, difficulty, nutrition }`;
    return this.gemini.generateJson<Partial<GeneratedRecipe>>(prompt, { maxOutputTokens: 3000 });
  }

  async substituteIngredient(
    ingredients: Array<{ name: string; quantity: number; unit: string }>,
    oldIngredient: string,
  ): Promise<{ substitution: string; updatedIngredients: Array<{ name: string; quantity: number; unit: string }> }> {
    if (!this.gemini.isConfigured()) {
      const updated = ingredients.map((i) =>
        i.name.toLowerCase() === oldIngredient.toLowerCase()
          ? { ...i, name: 'Olive Oil' }
          : i,
      );
      return { substitution: 'Olive Oil', updatedIngredients: updated };
    }
    const prompt = `Replace "${oldIngredient}" in this ingredient list with a suitable substitute. Return JSON: { "substitution": "name", "updatedIngredients": [...] }
List: ${JSON.stringify(ingredients)}`;
    return this.gemini.generateJson(prompt);
  }

  private demoRecipes(input: GenerateRecipesInput): GeneratedRecipe[] {
    const hasPaneer = input.ingredients.some((i) => i.toLowerCase().includes('paneer'));
    const hasTomato = input.ingredients.some((i) => i.toLowerCase().includes('tomato'));
    const hasEgg = input.ingredients.some((i) => i.toLowerCase().includes('egg'));
    const hasSpinach = input.ingredients.some((i) => i.toLowerCase().includes('spinach'));

    const recipes: GeneratedRecipe[] = [];

    if (hasPaneer && hasTomato) {
      recipes.push({
        title: 'Paneer Tomato Masala',
        description: 'A rich, creamy Indian classic made with fresh paneer and juicy tomatoes. [Demo Mode]',
        ingredients: [
          { name: 'Paneer', quantity: 250, unit: 'g' },
          { name: 'Tomatoes', quantity: 4, unit: 'pcs' },
          { name: 'Onions', quantity: 2, unit: 'pcs' },
          { name: 'Ginger-garlic paste', quantity: 1, unit: 'tbsp' },
          { name: 'Cream', quantity: 100, unit: 'ml' },
        ],
        missingIngredients: ['Ginger-garlic paste', 'Cream'],
        instructions: [
          { step: 1, text: 'Cube paneer and chop tomatoes and onions.' },
          { step: 2, text: 'Heat oil, sauté onions until golden.' },
          { step: 3, text: 'Add ginger-garlic paste and cook for 1 minute.' },
          { step: 4, text: 'Add tomatoes, cook until soft, then blend into a puree.' },
          { step: 5, text: 'Add paneer cubes and cream, simmer for 10 minutes.' },
          { step: 6, text: 'Garnish with coriander and serve hot.' },
        ],
        prepTime: 15,
        cookingTime: 25,
        servings: input.servings || 2,
        difficulty: input.difficulty || 'Easy',
        nutrition: { calories: 420, protein: 22, carbs: 18, fat: 28, fiber: 4 },
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80',
        cuisine: input.cuisine || 'Indian',
      });
    }

    if (hasEgg && hasSpinach) {
      recipes.push({
        title: 'Spinach Omelette',
        description: 'A protein-packed breakfast omelette with fresh spinach. [Demo Mode]',
        ingredients: [
          { name: 'Eggs', quantity: 3, unit: 'pcs' },
          { name: 'Spinach', quantity: 100, unit: 'g' },
          { name: 'Onions', quantity: 1, unit: 'pcs' },
          { name: 'Salt', quantity: 1, unit: 'tsp' },
          { name: 'Pepper', quantity: 1, unit: 'tsp' },
        ],
        missingIngredients: ['Salt', 'Pepper'],
        instructions: [
          { step: 1, text: 'Whisk eggs with salt and pepper.' },
          { step: 2, text: 'Chop spinach and onions finely.' },
          { step: 3, text: 'Heat a pan with butter.' },
          { step: 4, text: 'Sauté onions and spinach for 2 minutes.' },
          { step: 5, text: 'Pour eggs, cook on low heat, fold and serve.' },
        ],
        prepTime: 5,
        cookingTime: 10,
        servings: input.servings || 2,
        difficulty: 'Easy',
        nutrition: { calories: 280, protein: 20, carbs: 6, fat: 20, fiber: 3 },
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
        cuisine: 'Continental',
      });
    }

    recipes.push({
      title: 'Quick Tomato Onion Sabzi',
      description: 'A simple, fast Indian side dish with pantry staples. [Demo Mode]',
      ingredients: [
        { name: 'Tomatoes', quantity: 3, unit: 'pcs' },
        { name: 'Onions', quantity: 2, unit: 'pcs' },
        { name: 'Cumin seeds', quantity: 1, unit: 'tsp' },
        { name: 'Turmeric', quantity: 0.5, unit: 'tsp' },
        { name: 'Oil', quantity: 2, unit: 'tbsp' },
      ],
      missingIngredients: ['Cumin seeds', 'Turmeric'],
      instructions: [
        { step: 1, text: 'Chop tomatoes and onions.' },
        { step: 2, text: 'Heat oil, add cumin seeds.' },
        { step: 3, text: 'Add onions, cook until translucent.' },
        { step: 4, text: 'Add tomatoes and turmeric, cook until mushy.' },
        { step: 5, text: 'Season and serve with bread or rice.' },
      ],
      prepTime: 10,
      cookingTime: 15,
      servings: input.servings || 2,
      difficulty: 'Easy',
      nutrition: { calories: 180, protein: 4, carbs: 22, fat: 8, fiber: 5 },
      image: 'https://images.unsplash.com/photo-1606491956682-2e462852c382?w=800&q=80',
      cuisine: 'Indian',
    });

    return recipes.slice(0, 3);
  }

  private demoModify(input: ModifyRecipeInput): Partial<GeneratedRecipe> {
    const instr = input.instruction.toLowerCase();
    if (instr.includes('vegetarian')) {
      return {
        ...input.currentRecipe,
        description: input.currentRecipe.description + ' (Modified: vegetarian) [Demo Mode]',
        ingredients: input.currentRecipe.ingredients.map((i) =>
          /chicken|beef|pork|lamb|fish|meat/i.test(i.name) ? { ...i, name: 'Tofu' } : i,
        ),
      };
    }
    if (instr.includes('dairy-free')) {
      return {
        ...input.currentRecipe,
        description: input.currentRecipe.description + ' (Modified: dairy-free) [Demo Mode]',
        ingredients: input.currentRecipe.ingredients.map((i) =>
          /milk|cream|cheese|butter|paneer/i.test(i.name) ? { ...i, name: 'Coconut Milk' } : i,
        ),
      };
    }
    return {
      ...input.currentRecipe,
      description: input.currentRecipe.description + ` (Modified per: "${input.instruction}") [Demo Mode]`,
    };
  }
}
