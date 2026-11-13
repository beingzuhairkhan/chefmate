import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CookingSession, CookingSessionSchema } from './schemas/cooking-session.schema';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { PantryModule } from '../pantry/pantry.module';
import { GroceryModule } from '../grocery/grocery.module';
import { MealPlannerModule } from '../meal-planner/meal-planner.module';
import { RecipesModule } from '../recipes/recipes.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CookingSession.name, schema: CookingSessionSchema }]),
    PantryModule,
    GroceryModule,
    MealPlannerModule,
    RecipesModule,
    AutomationModule,
  ],
  providers: [VoiceService],
  controllers: [VoiceController],
  exports: [VoiceService],
})
export class VoiceModule {}
