import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini.service';

export interface IngredientRecognition {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
  estimatedExpiryDays?: number;
}

@Injectable()
export class PantryAgent {
  private readonly logger = new Logger(PantryAgent.name);

  constructor(private readonly gemini: GeminiService) {}

  isConfigured() {
    return this.gemini.isConfigured();
  }

  async recognizeIngredients(imageBase64: string, mimeType = 'image/jpeg'): Promise<IngredientRecognition[]> {
    const result = await this.gemini.analyzeImage(imageBase64, mimeType);
    return result.ingredients;
  }

  async suggestRecipesFromPantry(ingredientNames: string[]): Promise<string[]> {
    if (!this.gemini.isConfigured()) {
      return ['Paneer Tomato Curry', 'Spinach Omelette', 'Quick Onion Tomato Sabzi'];
    }
    const prompt = `Given these pantry ingredients: ${ingredientNames.join(', ')}. Suggest 3 dish names that can be made. Return JSON: { "dishes": ["name1", "name2", "name3"] }`;
    const res = await this.gemini.generateJson<{ dishes: string[] }>(prompt);
    return res.dishes || [];
  }
}
