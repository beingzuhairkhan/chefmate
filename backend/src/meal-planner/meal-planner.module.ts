import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MealPlan, MealPlanSchema } from './schemas/meal-plan.schema';
import { MealPlannerService } from './meal-planner.service';
import { MealPlannerController } from './meal-planner.controller';
import { PantryModule } from '../pantry/pantry.module';
import { GroceryModule } from '../grocery/grocery.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MealPlan.name, schema: MealPlanSchema }]),
    PantryModule,
    GroceryModule,
    AutomationModule,
  ],
  providers: [MealPlannerService],
  controllers: [MealPlannerController],
  exports: [MealPlannerService],
})
export class MealPlannerModule {}
