import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeminiTextOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export interface GeminiVisionResult {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    confidence: number;
    estimatedExpiryDays?: number;
  }>;
}

interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  temperature: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  image?: { base64: string; mimeType: string };
}

const RETRYABLE_STATUS = [429, 500, 502, 503];
const AI_REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  
  private readonly openrouterKey: string;
  private readonly openrouterTextModel: string;
  private readonly openrouterVisionModel: string;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallbackModels: string[];

  constructor(private readonly config: ConfigService) {
    this.openrouterKey = this.config.get<string>('app.openrouterApiKey') || '';

    this.openrouterTextModel =
      this.config.get<string>('app.openrouterModel') || 'openrouter/free';
    this.openrouterVisionModel =
      this.config.get<string>('app.openrouterVisionModel') || 'openrouter/free';

    this.apiKey = this.config.get<string>('app.geminiApiKey') || '';
    this.model = this.config.get<string>('app.geminiModel') || 'gemini-3.8-flash';
    this.fallbackModels = [
      this.model,
      this.config.get<string>('app.geminiFallbackModel') || 'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i); // dedupe
  }

  isConfigured() {
    return Boolean(this.openrouterKey || this.apiKey);
  }


  private async callAi(req: AiRequest): Promise<string> {
    let lastError: any;

    if (this.apiKey) {
      try {
        return await this.callGemini(req);
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini failed (${err.message}).`);
      }
    }

    if (this.openrouterKey) {
      this.logger.warn('Falling back to the OpenRouter free-model router...');
      try {
        return await this.callOpenRouter(req);
      } catch (err: any) {
        lastError = err;
        this.logger.error(`OpenRouter fallback failed: ${err.message}`);
      }
    }

    throw lastError ?? new Error('No AI provider configured');
  }

  
  private buildOpenRouterMessages(req: AiRequest) {
    const messages: any[] = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    if (req.image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: req.prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:${req.image.mimeType};base64,${req.image.base64}`,
            },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: req.prompt });
    }
    return messages;
  }

  private async callOpenRouter(req: AiRequest): Promise<string> {
    const model = req.image ? this.openrouterVisionModel : this.openrouterTextModel;
    let lastError: any;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openrouterKey}`,
            'X-Title': 'Smart Kitchen',
          },
          body: JSON.stringify({
            model,
            messages: this.buildOpenRouterMessages(req),
            temperature: req.temperature,
            ...(req.responseMimeType === 'application/json'
              ? { response_format: { type: 'json_object' } }
              : {}),
            ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          const err = new Error(`OpenRouter (${model}) error ${res.status}: ${errText}`) as any;
          err.status = res.status;
          throw err;
        }

        const data = await res.json();

     
        if (data?.error) {
          const err = new Error(
            `OpenRouter (${model}) error: ${data.error.message ?? JSON.stringify(data.error)}`,
          ) as any;
          err.status = data.error.code;
          throw err;
        }

        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenRouter returned empty response');
        return text;
      } catch (err: any) {
        lastError = err;
        if (RETRYABLE_STATUS.includes(err.status) && attempt === 0) {
          this.logger.warn(`OpenRouter ${model} busy (${err.status}), retrying in 2s...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break; // give up -> caller falls back to Gemini
      }
    }
    throw lastError;
  }

  
  private buildGeminiBody(req: AiRequest) {
    const parts: any[] = [{ text: req.prompt }];
    if (req.image) {
      parts.push({
        inlineData: { mimeType: req.image.mimeType, data: req.image.base64 },
      });
    }
    const body: any = {
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: req.temperature },
    };
    if (req.responseMimeType) {
      body.generationConfig.responseMimeType = req.responseMimeType;
    }
    if (req.maxOutputTokens) {
      body.generationConfig.maxOutputTokens = req.maxOutputTokens;
    }
    if (req.systemPrompt) {
      body.systemInstruction = { parts: [{ text: req.systemPrompt }] };
    }
    return body;
  }

  private async callGemini(req: AiRequest): Promise<string> {
    const body = this.buildGeminiBody(req);
    let lastError: any;

    for (const model of this.fallbackModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey, 
            },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const errText = await res.text();
            const err = new Error(`Gemini error ${res.status}: ${errText}`) as any;
            err.status = res.status;
            throw err;
          }

          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Gemini returned empty response');
          return text;
        } catch (err: any) {
          lastError = err;

          if (RETRYABLE_STATUS.includes(err.status) && attempt === 0) {
            this.logger.warn(`Gemini ${model} busy (${err.status}), retrying in 2s...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue; // retry same model once
          }

          if (
            err.status === 404 ||
            RETRYABLE_STATUS.includes(err.status) ||
            !err.status
          ) {
            this.logger.warn(`Gemini ${model} failed, trying next model...`);
            break;
          }

          throw err;
        }
      }
    }
    throw lastError;
  }

  async generateText(prompt: string, options: GeminiTextOptions = {}): Promise<string> {
    if (!this.isConfigured()) {
      return this.demoText(prompt);
    }
    try {
      return await this.callAi({
        prompt,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        responseMimeType: options.responseMimeType,
      });
    } catch (err) {
      this.logger.error(`AI generateText failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async generateJson<T>(prompt: string, options: GeminiTextOptions = {}): Promise<T> {
    const raw = await this.generateText(`${prompt}\n\nReturn ONLY valid JSON, no markdown fences.`, {
      ...options,
      temperature: options.temperature ?? 0.3,
      responseMimeType: 'application/json',
    });
    return this.parseJsonResponse<T>(raw);
  }

  async analyzeImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<GeminiVisionResult> {
    if (!this.isConfigured()) {
      return this.demoVisionResult();
    }
    const prompt = `Analyze this fridge/pantry image and identify all food ingredients. Return JSON with an "ingredients" array. Each item: { name, quantity (number), unit, category (Vegetables|Fruits|Dairy|Grains|Spices|Meat & Seafood|Other), confidence (0-1), estimatedExpiryDays (number) }. Return ONLY JSON.`;
    try {
      const text = await this.callAi({
        prompt,
        temperature: 0.2,
        image: { base64: imageBase64, mimeType },
      });
      return this.parseJsonResponse<GeminiVisionResult>(text);
    } catch (err) {
      this.logger.error(`AI analyzeImage failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private parseJsonResponse<T>(text: string): T {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error('Failed to parse AI JSON response');
    }
  }

  private demoText(prompt: string): string {
    return `[Demo Mode] AI text generation is simulated. Configure OPENROUTER_API_KEY or GEMINI_API_KEY to enable real AI responses. Prompt received: ${prompt.slice(0, 120)}...`;
  }

  private demoVisionResult(): GeminiVisionResult {
    return {
      ingredients: [
        { name: 'Tomatoes', quantity: 4, unit: 'pcs', category: 'Vegetables', confidence: 0.95, estimatedExpiryDays: 5 },
        { name: 'Onions', quantity: 3, unit: 'pcs', category: 'Vegetables', confidence: 0.92, estimatedExpiryDays: 14 },
        { name: 'Milk', quantity: 1, unit: 'L', category: 'Dairy', confidence: 0.97, estimatedExpiryDays: 2 },
        { name: 'Eggs', quantity: 6, unit: 'pcs', category: 'Dairy', confidence: 0.96, estimatedExpiryDays: 10 },
        { name: 'Spinach', quantity: 200, unit: 'g', category: 'Vegetables', confidence: 0.88, estimatedExpiryDays: 3 },
        { name: 'Paneer', quantity: 250, unit: 'g', category: 'Dairy', confidence: 0.9, estimatedExpiryDays: 4 },
      ],
    };
  }
}