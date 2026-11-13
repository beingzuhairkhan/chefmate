import type { MealPlan, MealType } from '@/types';
import { useAppStore, type MealPlannerInput } from '@/lib/store';
import {
  generateGroceryForPlan,
  generateMealPlan as requestMealPlan,
  regeneratePlanDay,
  replaceMealWithGenerated,
} from '@/lib/backend';

export async function generateMealPlan(input: MealPlannerInput): Promise<MealPlan> {
  const plan = await requestMealPlan(input);
  useAppStore.setState({ lastPlannerInput: input, mealPlan: plan });
  return plan;
}

export async function regenerateDay(plan: MealPlan, dayIndex: number): Promise<MealPlan> {
  return regeneratePlanDay(plan, dayIndex);
}

export async function replaceMeal(plan: MealPlan, dayIndex: number, mealType: MealType): Promise<MealPlan> {
  return replaceMealWithGenerated(plan, dayIndex, mealType);
}

export async function groceryListFromPlan(plan: MealPlan): Promise<{ count: number }> {
  await generateGroceryForPlan(plan);
  const count = useAppStore.getState().groceryList?.items.length ?? 0;
  return { count };
}

