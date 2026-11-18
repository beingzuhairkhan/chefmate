import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
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
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
];

export async function transcribeAudio(audioBase64: string, language = 'en-IN'): Promise<string> {
  return transcribe(audioBase64, language);
}

function splitSpeech(text: string, maxLength = 240): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]?/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences.map((part) => part.trim()).filter(Boolean)) {
    if (sentence.length > maxLength) {
      if (current) chunks.push(current);
      current = '';
      const words = sentence.split(/\s+/);
      for (const word of words) {
        if (current && current.length + word.length + 1 > maxLength) {
          chunks.push(current);
          current = '';
        }
        current = current ? `${current} ${word}` : word;
      }
    } else if (current && current.length + sentence.length + 1 > maxLength) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function playAudioChunk(audioBase64: string): Promise<void> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error('Voice unavailable. Audio storage is not available on this device.');

  const audioUri = `${cacheDirectory}chefmate-voice-${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(audioUri, audioBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

  const player = createAudioPlayer({ uri: audioUri });
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(
        () => finish(new Error('Voice playback timed out. Please try again.')),
        60000,
      );
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) finish();
      });
      try {
        player.play();
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Voice playback failed.'));
      }
    });
  } finally {
    player.remove();
    await FileSystem.deleteAsync(audioUri, { idempotent: true });
  }
}

export async function speakText(text: string, language = 'en-IN'): Promise<void> {
  const chunks = splitSpeech(text);
  if (chunks.length === 0) return;

  let result = await speakWithBackend(chunks[0], language).then(
    (response) => ({ response }),
    (error: unknown) => ({ error }),
  );
  for (let index = 0; index < chunks.length; index += 1) {
    if ('error' in result) throw result.error;
    const nextResult = index + 1 < chunks.length
      ? speakWithBackend(chunks[index + 1], language).then(
        (response) => ({ response }),
        (error: unknown) => ({ error }),
      )
      : undefined;
    await playAudioChunk(result.response.audioBase64);
    if (nextResult) result = await nextResult;
  }
}

