import * as Speech from 'expo-speech';
import type { Nutrition, Recipe, RecipeFilters, ScannedIngredient } from '@/types';
import { isLiveBackend } from '@/lib/api';
import {
  analyzeRecipeNutrition as analyze,
  generateRecipes as generate,
  modifyRecipe as modify,
  respondToVoice,
  scanFridgeImage as scan,
  speakWithBackend,
  transcribeAudio as transcribe,
} from '@/lib/backend';

export { isLiveBackend };

export async function scanFridgeImage(imageUri: string): Promise<ScannedIngredient[]> {
  return scan(imageUri);
}

export async function generateRecipes(filters: RecipeFilters): Promise<Recipe[]> {
  return generate(filters);
}

export async function modifyRecipe(recipe: Recipe, request: string): Promise<Recipe> {
  return modify(recipe, request);
}

export async function analyzeRecipeNutrition(recipe: Recipe): Promise<Nutrition> {
  const result = await analyze(recipe);
  const source = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const nutrition = source.nutrition && typeof source.nutrition === 'object'
    ? source.nutrition as Record<string, unknown>
    : source;
  return {
    calories: Number(nutrition.calories) || 0,
    protein: Number(nutrition.protein) || 0,
    carbs: Number(nutrition.carbs) || 0,
    fat: Number(nutrition.fat) || 0,
    fiber: Number(nutrition.fiber) || 0,
  };
}

export async function processVoiceCommand(
  transcript: string,
  context: { activeRecipe?: Recipe | null },
  language = 'en-IN',
): Promise<{ action: Record<string, unknown> | null; reply: string; actionLabel?: string }> {
  const result = await respondToVoice(transcript, language, {
    activeRecipe: context.activeRecipe
      ? { id: context.activeRecipe.id, title: context.activeRecipe.title }
      : null,
  });
  return { ...result, action: result.action ?? null };
}

export const DEMO_TRANSCRIPTS = [
  'Mere paas paneer aur tomato hai, kya bana sakta hoon?',
  'Suggest a healthy breakfast.',
  'Add two kilograms of potatoes to my pantry.',
  "Generate tomorrow's meal plan.",
  'Add missing ingredients to my shopping list.',
];

export const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
];

export async function transcribeAudio(audioBase64: string, language = 'en-IN'): Promise<string> {
  return transcribe(audioBase64, language);
}

export async function speakText(text: string, language = 'en-IN'): Promise<void> {
  await speakWithBackend(text, language);
  await new Promise<void>((resolve, reject) => {
    Speech.speak(text, { language, rate: 1, onDone: resolve, onStopped: resolve, onError: reject });
  });
}

