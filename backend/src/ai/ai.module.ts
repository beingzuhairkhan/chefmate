import { Global, Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { SarvamService } from './sarvam.service';
import { PantryAgent } from './agents/pantry-agent';
import { RecipeAgent } from './agents/recipe-agent';
import { MealPlannerAgent } from './agents/meal-planner-agent';
import { NutritionAgent } from './agents/nutrition-agent';
import { VoiceAgent } from './agents/voice-agent';

@Global()
@Module({
  providers: [
    GeminiService,
    SarvamService,
    PantryAgent,
    RecipeAgent,
    MealPlannerAgent,
    NutritionAgent,
    VoiceAgent,
  ],
  exports: [
    GeminiService,
    SarvamService,
    PantryAgent,
    RecipeAgent,
    MealPlannerAgent,
    NutritionAgent,
    VoiceAgent,
  ],
})
export class AiModule {}
