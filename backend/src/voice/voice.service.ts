import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CookingSession, CookingSessionDocument } from './schemas/cooking-session.schema';
import { VoiceAgent, VoiceToolCall } from '../ai/agents/voice-agent';
import { PantryService } from '../pantry/pantry.service';
import { GroceryService } from '../grocery/grocery.service';
import { MealPlannerService } from '../meal-planner/meal-planner.service';
import { RecipesService } from '../recipes/recipes.service';
import { NutritionAgent } from '../ai/agents/nutrition-agent';
import { AutomationService } from '../automation/automation.service';
import { AutomationJobType, AutomationJobStatus } from '../common/constants';

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  result: any;
  message: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @InjectModel(CookingSession.name) private readonly sessionModel: Model<CookingSessionDocument>,
    private readonly voiceAgent: VoiceAgent,
    private readonly pantryService: PantryService,
    private readonly groceryService: GroceryService,
    private readonly mealPlannerService: MealPlannerService,
    private readonly recipesService: RecipesService,
    private readonly nutritionAgent: NutritionAgent,
    private readonly automationService: AutomationService,
  ) {}

  isConfigured() {
    return this.voiceAgent.isConfigured();
  }

  async transcribe(audio: string, language = 'en-IN') {
    return this.voiceAgent.transcribe(audio, language);
  }

  async respond(userId: string, text: string, language = 'en-IN', context?: Record<string, any>) {
    const understanding = await this.voiceAgent.understand(text);

    const executionResults: ToolExecutionResult[] = [];
    for (const call of understanding.toolCalls) {
      const result = await this.executeTool(userId, call, context);
      executionResults.push(result);
    }

    await this.automationService.logJob(userId, AutomationJobType.VOICE_ACTION, AutomationJobStatus.COMPLETED, {
      transcript: text,
      toolCalls: understanding.toolCalls,
      results: executionResults,
    });

    return {
      transcript: text,
      textResponse: understanding.textResponse,
      toolCalls: understanding.toolCalls,
      executionResults,
      demoMode: understanding.demoMode,
    };
  }

  async speak(text: string, language = 'en-IN') {
    return this.voiceAgent.speak(text, language);
  }

  async fullPipeline(userId: string, audio: string, language = 'en-IN') {
    const { transcript } = await this.voiceAgent.transcribe(audio, language);
    return this.respond(userId, transcript, language);
  }

  private async executeTool(userId: string, call: VoiceToolCall, context?: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      switch (call.tool) {
        case 'add_pantry_item': {
          const item = await this.pantryService.create(userId, {
            name: call.args.name,
            quantity: call.args.quantity,
            unit: call.args.unit || 'pcs',
            category: call.args.category || 'Other',
          });
          return { tool: call.tool, success: true, result: item, message: `Added ${call.args.name} to pantry` };
        }
        case 'remove_pantry_item': {
          const items = await this.pantryService.findAll(userId);
          const target = items.find((i) => i.name.toLowerCase().includes(String(call.args.name).toLowerCase()));
          if (target) {
            await this.pantryService.remove(String(target._id), userId);
            return { tool: call.tool, success: true, result: { id: target._id }, message: `Removed ${call.args.name} from pantry` };
          }
          return { tool: call.tool, success: false, result: null, message: `${call.args.name} not found in pantry` };
        }
        case 'generate_recipes': {
          const result = await this.recipesService.generate(userId, {
            ingredients: call.args.ingredients || (await this.pantryService.getNames(userId)),
            cuisine: call.args.cuisine,
          });
          return { tool: call.tool, success: true, result, message: `Generated ${result.recipes.length} recipes` };
        }
        case 'generate_meal_plan': {
          const result = await this.mealPlannerService.generate(userId, {
            budget: call.args.budget,
            dietaryPreference: call.args.dietaryPreference,
          });
          return { tool: call.tool, success: true, result, message: 'Generated weekly meal plan' };
        }
        case 'add_grocery_items': {
          const list = await this.groceryService.addItemsBulk(userId, call.args.items || []);
          return { tool: call.tool, success: true, result: list, message: `Added ${call.args.items?.length || 0} items to grocery list` };
        }
        case 'set_timer': {
          return { tool: call.tool, success: true, result: { seconds: call.args.seconds }, message: `Timer set for ${call.args.seconds} seconds` };
        }
        case 'next_cooking_step': {
          const session = await this.advanceCookingStep(userId, context?.recipeId);
          return { tool: call.tool, success: true, result: session, message: session?.status === 'completed' ? 'Cooking complete!' : 'Moved to next step' };
        }
        case 'modify_recipe': {
          if (!call.args.recipeId && context?.recipeId) call.args.recipeId = context.recipeId;
          if (!call.args.recipeId) return { tool: call.tool, success: false, result: null, message: 'No active recipe to modify' };
          const result = await this.recipesService.modify(call.args.recipeId, userId, { instruction: call.args.instruction });
          return { tool: call.tool, success: true, result, message: 'Recipe modified' };
        }
        case 'get_recipe_nutrition': {
          const recipeId = call.args.recipeId || context?.recipeId;
          if (!recipeId) return { tool: call.tool, success: false, result: null, message: 'No active recipe' };
          const recipe = await this.recipesService.findOne(recipeId, userId);
          const nutrition = await this.nutritionAgent.analyzeNutrition({
            recipeTitle: recipe.title,
            ingredients: recipe.ingredients.map((i: any) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
            servings: recipe.servings,
          });
          return { tool: call.tool, success: true, result: nutrition, message: 'Nutrition retrieved' };
        }
        default:
          return { tool: call.tool, success: false, result: null, message: `Unknown tool: ${call.tool}` };
      }
    } catch (err) {
      this.logger.error(`Tool execution failed for ${call.tool}: ${(err as Error).message}`);
      return { tool: call.tool, success: false, result: null, message: (err as Error).message };
    }
  }

  async startCooking(userId: string, recipeId: string) {
    const recipe = await this.recipesService.findOne(recipeId, userId);
    return this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      recipeId: new Types.ObjectId(recipeId),
      currentStep: 0,
      status: 'active',
    });
  }

  async advanceCookingStep(userId: string, recipeId?: string) {
    const query: Record<string, any> = { userId: new Types.ObjectId(userId), status: 'active' };
    if (recipeId) query.recipeId = new Types.ObjectId(recipeId);
    const session = await this.sessionModel.findOne(query).sort({ createdAt: -1 }).exec();
    if (!session) return null;
    session.currentStep += 1;
    const recipe = await this.recipesService.findOne(String(session.recipeId), userId);
    if (session.currentStep >= recipe.instructions.length) {
      session.status = 'completed';
    }
    await session.save();
    return session;
  }

  async updateCookingSession(userId: string, sessionId: string, updates: { currentStep?: number; timer?: number; status?: string }) {
    const session = await this.sessionModel
      .findOneAndUpdate(
        { _id: sessionId, userId: new Types.ObjectId(userId) },
        { $set: updates },
        { new: true },
      )
      .exec();
    if (!session) throw new NotFoundException('Cooking session not found');
    return session;
  }

  async getActiveSession(userId: string) {
    return this.sessionModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
  }
}
