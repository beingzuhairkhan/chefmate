// src/demo/demo.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

// Import your schemas - adjust paths to where they actually are
import { PantryItem, PantryItemSchema } from '../pantry/schemas/pantry-item.schema';
import { Recipe, RecipeSchema } from '../recipes/schemas/recipe.schema';
import { MealPlan, MealPlanSchema } from '../meal-planner/schemas/meal-plan.schema';
import { GroceryList, GroceryListSchema } from '../grocery/schemas/grocery-list.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { AutomationJob, AutomationJobSchema } from '../automation/schemas/automation-job.schema';

// Also need AuthModule if DemoService uses AuthService
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: PantryItem.name, schema: PantryItemSchema },
      { name: Recipe.name, schema: RecipeSchema },
      { name: MealPlan.name, schema: MealPlanSchema },
      { name: GroceryList.name, schema: GroceryListSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AutomationJob.name, schema: AutomationJobSchema },
    ]),
  ],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}