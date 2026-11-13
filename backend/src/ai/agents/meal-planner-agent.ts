import { Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini.service';

export interface MealPlanInput {
  budget?: number;
  dietaryPreference?: string;
  householdSize?: number;
  availableIngredients?: string[];
  nutritionPreference?: string;
}

export interface GeneratedMealPlan {
  days: Array<{
    day: string;
    meals: Array<{
      type: string;
      recipeTitle: string;
      description: string;
    }>;
  }>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

@Injectable()
export class MealPlannerAgent {
  constructor(private readonly gemini: GeminiService) {}

  isConfigured() {
    return this.gemini.isConfigured();
  }

  async generateWeeklyPlan(input: MealPlanInput): Promise<GeneratedMealPlan> {
    if (!this.gemini.isConfigured()) {
      return this.demoPlan(input);
    }
    const prompt = `Create a 7-day meal plan (Monday-Sunday) with breakfast, lunch, dinner, snacks for each day.
Budget: $${input.budget || 100}
Dietary preference: ${input.dietaryPreference || 'none'}
Household size: ${input.householdSize || 2}
Available ingredients: ${(input.availableIngredients || []).join(', ')}
Nutrition preference: ${input.nutritionPreference || 'balanced'}

Return JSON: { "days": [{ "day": "Monday", "meals": [{ "type": "breakfast", "recipeTitle": "...", "description": "..." }] }] }`;

    return this.gemini.generateJson<GeneratedMealPlan>(prompt, { maxOutputTokens: 4000 });
  }

  async replaceMeal(
    day: string,
    mealType: string,
    preferences: Record<string, any>,
  ): Promise<{ recipeTitle: string; description: string }> {
    if (!this.gemini.isConfigured()) {
      return {
        recipeTitle: 'Grilled Vegetable Bowl',
        description: 'A healthy replacement meal with seasonal vegetables. [Demo Mode]',
      };
    }
    const prompt = `Suggest a single ${mealType} meal for ${day}. Preferences: ${JSON.stringify(preferences)}. Return JSON: { "recipeTitle": "...", "description": "..." }`;
    return this.gemini.generateJson(prompt);
  }

  private demoPlan(input: MealPlanInput): GeneratedMealPlan {
    const veg = input.dietaryPreference?.toLowerCase().includes('veg');
    const breakfasts = veg
      ? ['Vegetable Poha', 'Masala Oats', 'Upma with Vegetables', 'Besan Chilla', 'Idli Sambar', 'Aloo Paratha', 'Fruit & Yogurt Bowl']
      : ['Egg Bhurji with Toast', 'Chicken Sandwich', 'Vegetable Poha', 'Masala Oats', 'Besan Chilla', 'Aloo Paratha', 'Omelette & Juice'];
    const lunches = ['Rajma Chawal', 'Paneer Tikka Wrap', 'Dal Tadka & Rice', 'Chole Bhature', 'Vegetable Biryani', 'Palak Paneer & Roti', 'Sambar Rice'];
    const dinners = ['Mixed Veg Sabzi & Roti', 'Paneer Butter Masala', 'Aloo Gobi & Phulka', 'Tomato Dal & Rice', 'Kadai Paneer', 'Mushroom Masala', 'Simple Dal Khichdi'];
    const snacks = ['Masala Chai & Biscuits', 'Roasted Makhana', 'Fruit Salad', 'Samosa', 'Sprouts Chaat', 'Tea & Rusk', 'Peanut Ladoo'];

    return {
      days: DAYS.map((day, i) => ({
        day,
        meals: [
          { type: 'breakfast', recipeTitle: breakfasts[i % breakfasts.length], description: 'A nutritious start to the day. [Demo Mode]' },
          { type: 'lunch', recipeTitle: lunches[i % lunches.length], description: 'A balanced midday meal. [Demo Mode]' },
          { type: 'dinner', recipeTitle: dinners[i % dinners.length], description: 'A comforting evening meal. [Demo Mode]' },
          { type: 'snacks', recipeTitle: snacks[i % snacks.length], description: 'A light evening snack. [Demo Mode]' },
        ],
      })),
    };
  }
}

export { DAYS, MEAL_TYPES };
