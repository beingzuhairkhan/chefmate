import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
  constructor(private readonly sarvam: SarvamService) {}

  isConfigured() {
    return this.sarvam.isConfigured();
  }

  async transcribe(audioBase64: string, language = 'en-IN'): Promise<{ transcript: string; demoMode: boolean }> {
    const transcript = await this.sarvam.speechToText(audioBase64, language);
    return { transcript, demoMode: false };
  }

  async understand(
    transcript: string,
    language = 'en-IN',
  ): Promise<{ textResponse: string; toolCalls: VoiceToolCall[]; demoMode: boolean }> {
    const toolsDescription = AVAILABLE_TOOLS.map(
      (t) => `- ${t.name}: ${t.description}. Params: ${JSON.stringify(t.parameters)}`,
    ).join('\n');

    const systemPrompt = `You are ChefMate Voice Assistant. Understand the user's cooking request and decide which tool(s) to call.
Available tools:
${toolsDescription}

Return JSON: { "textResponse": "what you say to the user", "toolCalls": [{ "tool": "tool_name", "args": {...} }] }
Only use tools from the list above. If no tool is needed, return empty toolCalls array. Keep textResponse conversational and brief.`;

    const content = await this.sarvam.understand(transcript, systemPrompt, language);
    let res: { textResponse?: string; toolCalls?: Array<{ tool: string; args: Record<string, any> }> };
    try {
      res = JSON.parse(content);
    } catch {
      throw new ServiceUnavailableException('Voice unavailable. Sarvam returned an invalid response.');
    }
    if (typeof res.textResponse !== 'string' || !Array.isArray(res.toolCalls)) {
      throw new ServiceUnavailableException('Voice unavailable. Sarvam returned an incomplete response.');
    }
    const toolCalls: VoiceToolCall[] = (res.toolCalls || [])
      .filter((tc) => tc && TOOL_NAMES.includes(tc.tool))
      .map((tc) => ({
        tool: tc.tool,
        args: tc.args || {},
        needsConfirmation: CONFIRMATION_TOOLS.has(tc.tool),
      }));
    return { textResponse: res.textResponse, toolCalls, demoMode: false };
  }

  async speak(text: string, language = 'en-IN'): Promise<{ audioBase64: string; demoMode: boolean }> {
    const audio = await this.sarvam.textToSpeech(text, language);
    return { audioBase64: audio, demoMode: !this.sarvam.isConfigured() };
  }

  async fullPipeline(audioBase64: string, language = 'en-IN'): Promise<VoiceResponse> {
    const { transcript } = await this.transcribe(audioBase64, language);
    const { textResponse, toolCalls } = await this.understand(transcript, language);
    const { audioBase64: audio } = await this.speak(textResponse, language);
    return {
      transcript,
      textResponse,
      toolCalls,
      audioBase64: audio,
      demoMode: !this.isConfigured(),
    };
  }

}

export { AVAILABLE_TOOLS };
