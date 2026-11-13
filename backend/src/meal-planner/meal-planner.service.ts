import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MealPlan, MealPlanDocument } from './schemas/meal-plan.schema';
import { GenerateMealPlanDto, UpdateMealPlanDto } from './dto/meal-plan.dto';
import { MealPlannerAgent } from '../ai/agents/meal-planner-agent';
import { PantryService } from '../pantry/pantry.service';
import { GroceryService } from '../grocery/grocery.service';
import { AutomationService } from '../automation/automation.service';

@Injectable()
export class MealPlannerService {
  constructor(
    @InjectModel(MealPlan.name) private readonly mealPlanModel: Model<MealPlanDocument>,
    private readonly mealPlannerAgent: MealPlannerAgent,
    private readonly pantryService: PantryService,
    private readonly groceryService: GroceryService,
    private readonly automationService: AutomationService,
  ) {}

  async generate(userId: string, dto: GenerateMealPlanDto) {
    const availableIngredients = dto.availableIngredients?.length
      ? dto.availableIngredients
      : await this.pantryService.getNames(userId);

    const generated = await this.mealPlannerAgent.generateWeeklyPlan({
      budget: dto.budget,
      dietaryPreference: dto.dietaryPreference,
      householdSize: dto.householdSize,
      availableIngredients,
      nutritionPreference: dto.nutritionPreference,
    });

    const weekStartDate = this.getStartOfWeek();

    // Upsert the meal plan
    const mealPlan = await this.mealPlanModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), weekStartDate },
        {
          $set: {
            userId: new Types.ObjectId(userId),
            weekStartDate,
            days: generated.days,
            budget: dto.budget,
            preferences: {
              dietaryPreference: dto.dietaryPreference,
              householdSize: dto.householdSize,
              nutritionPreference: dto.nutritionPreference,
            },
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    // Log automation job
    await this.automationService.logJob(userId, 'meal_plan_generate', 'completed', {
      weekStartDate,
      daysCount: generated.days.length,
    });

    return { mealPlan, demoMode: !this.mealPlannerAgent.isConfigured() };
  }

  async findCurrent(userId: string) {
    const weekStart = this.getStartOfWeek();
    return this.mealPlanModel
      .findOne({ userId: new Types.ObjectId(userId), weekStartDate: weekStart })
      .exec();
  }

  async findAll(userId: string) {
    return this.mealPlanModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ weekStartDate: -1 })
      .exec();
  }

  async findOne(id: string, userId: string) {
    const plan = await this.mealPlanModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!plan) throw new NotFoundException('Meal plan not found');
    return plan;
  }

  async update(id: string, userId: string, dto: UpdateMealPlanDto) {
    const updated = await this.mealPlanModel
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Meal plan not found');
    return updated;
  }

  async replaceMeal(userId: string, mealPlanId: string, day: string, mealType: string, preferences: Record<string, any>) {
    const plan = await this.mealPlanModel
      .findOne({ _id: mealPlanId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!plan) throw new NotFoundException('Meal plan not found');

    const replacement = await this.mealPlannerAgent.replaceMeal(day, mealType, preferences);
    const dayPlan = plan.days.find((d) => d.day === day);
    if (dayPlan) {
      const meal = dayPlan.meals.find((m) => m.type === mealType);
      if (meal) {
        meal.recipeTitle = replacement.recipeTitle;
        meal.description = replacement.description;
      } else {
        dayPlan.meals.push({ type: mealType, recipeTitle: replacement.recipeTitle, description: replacement.description });
      }
    }
    await plan.save();
    return { replacement, plan };
  }

  async generateGroceryFromPlan(userId: string, mealPlanId: string) {
    const plan = await this.mealPlanModel
      .findOne({ _id: mealPlanId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!plan) throw new NotFoundException('Meal plan not found');
    const result = await this.groceryService.generateFromMealPlan(userId, plan);
    await this.automationService.logJob(userId, 'grocery_generate', 'completed', {
      source: 'meal_plan',
      mealPlanId,
      addedItems: result.addedItems,
    });
    return result;
  }

  private getStartOfWeek(date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
