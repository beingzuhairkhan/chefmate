import { Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini.service';

export interface NutritionInput {
  recipeTitle: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  servings: number;
}

export interface NutritionResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  perServing: boolean;
  alternatives?: string[];
}

@Injectable()
export class NutritionAgent {
  constructor(private readonly gemini: GeminiService) {}

  isConfigured() {
    return this.gemini.isConfigured();
  }

  async analyzeNutrition(input: NutritionInput): Promise<NutritionResult> {
    if (!this.gemini.isConfigured()) {
      return this.demoNutrition(input);
    }
    const prompt = `Analyze nutrition for this recipe. Return JSON: { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "perServing": true, "alternatives": ["healthier option 1", "option 2"] }

Recipe: ${input.recipeTitle}
Ingredients: ${JSON.stringify(input.ingredients)}
Servings: ${input.servings}

Estimate per serving. Add 2 healthier alternatives.`;
    return this.gemini.generateJson<NutritionResult>(prompt);
  }

  async dailySummary(meals: Array<{ title: string; calories: number; protein: number; carbs: number; fat: number }>) {
    return {
      totalCalories: meals.reduce((s, m) => s + (m.calories || 0), 0),
      totalProtein: meals.reduce((s, m) => s + (m.protein || 0), 0),
      totalCarbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
      totalFat: meals.reduce((s, m) => s + (m.fat || 0), 0),
      meals,
      isEstimate: true,
    };
  }

  private demoNutrition(input: NutritionInput): NutritionResult {
    const cal = 300 + input.ingredients.length * 25;
    return {
      calories: Math.round(cal / input.servings),
      protein: Math.round((15 + input.ingredients.length * 2) / input.servings),
      carbs: Math.round((30 + input.ingredients.length * 3) / input.servings),
      fat: Math.round((12 + input.ingredients.length * 1.5) / input.servings),
      fiber: Math.round((4 + input.ingredients.length * 0.5) / input.servings),
      perServing: true,
      alternatives: ['Use less oil for lower fat', 'Swap cream with yogurt for fewer calories'],
    };
  }
}
