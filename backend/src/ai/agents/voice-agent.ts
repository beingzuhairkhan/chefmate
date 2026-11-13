import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini.service';
import { SarvamService } from '../sarvam.service';

export interface VoiceToolCall {
  tool: string;
  args: Record<string, any>;
  needsConfirmation: boolean;
}

export interface VoiceResponse {
  transcript: string;
  textResponse: string;
  toolCalls: VoiceToolCall[];
  audioBase64: string;
  demoMode: boolean;
}

const AVAILABLE_TOOLS = [
  {
    name: 'add_pantry_item',
    description: 'Add an ingredient to the user\'s pantry inventory',
    parameters: { name: 'string', quantity: 'number', unit: 'string', category: 'string' },
    needsConfirmation: false,
  },
  {
    name: 'remove_pantry_item',
    description: 'Remove an ingredient from the pantry',
    parameters: { name: 'string' },
    needsConfirmation: true,
  },
  {
    name: 'generate_recipes',
    description: 'Generate recipe suggestions from available ingredients',
    parameters: { ingredients: 'string[]', cuisine: 'string' },
    needsConfirmation: false,
  },
  {
    name: 'generate_meal_plan',
    description: 'Generate a weekly meal plan',
    parameters: { budget: 'number', dietaryPreference: 'string' },
    needsConfirmation: false,
  },
  {
    name: 'add_grocery_items',
    description: 'Add items to the grocery shopping list',
    parameters: { items: 'Array<{name,quantity,unit,category}>' },
    needsConfirmation: false,
  },
  {
    name: 'set_timer',
    description: 'Set a cooking timer in seconds',
    parameters: { seconds: 'number' },
    needsConfirmation: false,
  },
  {
    name: 'next_cooking_step',
    description: 'Move to the next cooking step in active cooking session',
    parameters: {},
    needsConfirmation: false,
  },
  {
    name: 'modify_recipe',
    description: 'Modify a recipe via natural language (e.g. make it vegetarian)',
    parameters: { recipeId: 'string', instruction: 'string' },
    needsConfirmation: false,
  },
  {
    name: 'get_recipe_nutrition',
    description: 'Get nutrition info for a recipe',
    parameters: { recipeId: 'string' },
    needsConfirmation: false,
  },
];

const TOOL_NAMES = AVAILABLE_TOOLS.map((t) => t.name);
const CONFIRMATION_TOOLS = new Set(AVAILABLE_TOOLS.filter((t) => t.needsConfirmation).map((t) => t.name));

@Injectable()
export class VoiceAgent {
  private readonly logger = new Logger(VoiceAgent.name);

  constructor(
    private readonly gemini: GeminiService,
    private readonly sarvam: SarvamService,
  ) {}

  isConfigured() {
    return this.gemini.isConfigured() && this.sarvam.isConfigured();
  }

  async transcribe(audioBase64: string, language = 'en-IN'): Promise<{ transcript: string; demoMode: boolean }> {
    const transcript = await this.sarvam.speechToText(audioBase64, language);
    return { transcript, demoMode: !this.sarvam.isConfigured() };
  }

  async understand(transcript: string): Promise<{ textResponse: string; toolCalls: VoiceToolCall[]; demoMode: boolean }> {
    if (!this.gemini.isConfigured()) {
      return this.demoUnderstand(transcript);
    }
    const toolsDescription = AVAILABLE_TOOLS.map(
      (t) => `- ${t.name}: ${t.description}. Params: ${JSON.stringify(t.parameters)}`,
    ).join('\n');

    const systemPrompt = `You are ChefMate Voice Assistant. Understand the user's cooking request and decide which tool(s) to call.
Available tools:
${toolsDescription}

Return JSON: { "textResponse": "what you say to the user", "toolCalls": [{ "tool": "tool_name", "args": {...} }] }
Only use tools from the list above. If no tool is needed, return empty toolCalls array. Keep textResponse conversational and brief.`;

    const prompt = `User said: "${transcript}"`;
    const res = await this.gemini.generateJson<{ textResponse: string; toolCalls: Array<{ tool: string; args: Record<string, any> }> }>(
      prompt,
      { systemPrompt, temperature: 0.2 },
    );
    const toolCalls: VoiceToolCall[] = (res.toolCalls || [])
      .filter((tc) => TOOL_NAMES.includes(tc.tool))
      .map((tc) => ({
        tool: tc.tool,
        args: tc.args || {},
        needsConfirmation: CONFIRMATION_TOOLS.has(tc.tool),
      }));
    return { textResponse: res.textResponse || 'I can help with that.', toolCalls, demoMode: false };
  }

  async speak(text: string, language = 'en-IN'): Promise<{ audioBase64: string; demoMode: boolean }> {
    const audio = await this.sarvam.textToSpeech(text, language);
    return { audioBase64: audio, demoMode: !this.sarvam.isConfigured() };
  }

  async fullPipeline(audioBase64: string, language = 'en-IN'): Promise<VoiceResponse> {
    const { transcript } = await this.transcribe(audioBase64, language);
    const { textResponse, toolCalls } = await this.understand(transcript);
    const { audioBase64: audio } = await this.speak(textResponse, language);
    return {
      transcript,
      textResponse,
      toolCalls,
      audioBase64: audio,
      demoMode: !this.isConfigured(),
    };
  }

  private demoUnderstand(transcript: string): { textResponse: string; toolCalls: VoiceToolCall[]; demoMode: boolean } {
    const lower = transcript.toLowerCase();

    if (lower.includes('paneer') || lower.includes('tomato') || lower.includes('kya bana')) {
      const ingredients = lower.match(/paneer|tomato|onion|spinach|egg|milk/g) || ['paneer', 'tomato'];
      return {
        textResponse: `I see you have ${ingredients.join(' and ')}. Let me generate some recipe suggestions for you. [Demo Mode]`,
        toolCalls: [{ tool: 'generate_recipes', args: { ingredients }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('breakfast')) {
      return {
        textResponse: 'Here\'s a healthy breakfast suggestion based on your pantry. [Demo Mode]',
        toolCalls: [{ tool: 'generate_recipes', args: { ingredients: [], cuisine: 'any' }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('potato') && lower.includes('pantry')) {
      const qtyMatch = lower.match(/(\d+)\s*(kilo|kg|kilogram)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) * 1000 : 2000;
      return {
        textResponse: `Adding ${qty} grams of potatoes to your pantry. [Demo Mode]`,
        toolCalls: [{ tool: 'add_pantry_item', args: { name: 'Potatoes', quantity: qty, unit: 'g', category: 'Vegetables' }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('meal plan') || lower.includes('tomorrow')) {
      return {
        textResponse: 'Generating your weekly meal plan now. [Demo Mode]',
        toolCalls: [{ tool: 'generate_meal_plan', args: { budget: 100, dietaryPreference: 'vegetarian' }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('grocery') || lower.includes('shopping') || lower.includes('missing ingredients')) {
      return {
        textResponse: 'I\'ll add the missing ingredients to your shopping list. [Demo Mode]',
        toolCalls: [{ tool: 'add_grocery_items', args: { items: [{ name: 'Missing items', quantity: 1, unit: 'pcs', category: 'Other' }] }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('timer') && lower.includes('minute')) {
      const minMatch = lower.match(/(\d+)\s*minute/);
      const seconds = minMatch ? parseInt(minMatch[1], 10) * 60 : 600;
      return {
        textResponse: `Setting a timer for ${seconds / 60} minutes. [Demo Mode]`,
        toolCalls: [{ tool: 'set_timer', args: { seconds }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('next') && lower.includes('step')) {
      return {
        textResponse: 'Moving to the next cooking step. [Demo Mode]',
        toolCalls: [{ tool: 'next_cooking_step', args: {}, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('vegetarian') || lower.includes('dairy-free') || lower.includes('spice') || lower.includes('cheaper')) {
      return {
        textResponse: `I'll modify the recipe: "${transcript}". [Demo Mode]`,
        toolCalls: [{ tool: 'modify_recipe', args: { recipeId: '', instruction: transcript }, needsConfirmation: false }],
        demoMode: true,
      };
    }
    if (lower.includes('protein') || lower.includes('nutrition') || lower.includes('calorie')) {
      return {
        textResponse: 'Here\'s the nutrition breakdown for this recipe. [Demo Mode]',
        toolCalls: [{ tool: 'get_recipe_nutrition', args: { recipeId: '' }, needsConfirmation: false }],
        demoMode: true,
      };
    }

    return {
      textResponse: 'I can help you scan your fridge, generate recipes, plan meals, manage groceries, set timers, and guide you through cooking. What would you like to do? [Demo Mode]',
      toolCalls: [],
      demoMode: true,
    };
  }
}

export { AVAILABLE_TOOLS };
