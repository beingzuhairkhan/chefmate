export type Unit =
  | 'pcs'
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | 'tbsp'
  | 'tsp'
  | 'cup'
  | 'pack';

export type Category =
  | 'Vegetables'
  | 'Fruits'
  | 'Dairy'
  | 'Grains'
  | 'Spices'
  | 'Meat & Seafood'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Grains',
  'Spices',
  'Meat & Seafood',
  'Other',
];

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: Unit;
}

export interface ScannedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  confidence: number;
  expiryDate?: string;
  selected: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number;
  cookingTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisine: string;
  dietaryTags: string[];
  nutrition: Nutrition;
  estimatedPrice: number;
  isFavorite: boolean;
  createdAt: string;
}

export interface RecipeFilters {
  ingredients: string[];
  cuisine: string;
  dietaryPreference: string;
  maxCookingTime: number;
  difficulty: string;
  budget: number;
  servings: number;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  expiryDate?: string;
  addedAt: string;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export interface MealSlot {
  recipeId: string;
  title: string;
  image: string;
  cookingTime: number;
  nutrition: Nutrition;
  description?: string;
}

export interface DayPlan {
  day: string;
  meals: Partial<Record<MealType, MealSlot>>;
}

export interface MealPlan {
  id: string;
  weekStartDate: string;
  days: DayPlan[];
  budget: number;
  dietaryPreference: string;
  householdSize: number;
  createdAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  estimatedPrice: number;
  purchased: boolean;
}

export interface GroceryList {
  id: string;
  items: GroceryItem[];
  generatedFrom: string;
  status: 'active' | 'completed';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'expiry' | 'plan' | 'system' | 'automation';
  read: boolean;
  createdAt: string;
}

export interface AutomationJob {
  id: string;
  jobType:
    | 'Fridge Scan'
    | 'Recipe Generation'
    | 'Meal Plan Generation'
    | 'Grocery Generation'
    | 'Expiry Check'
    | 'Voice Command';
  status: 'queued' | 'running' | 'completed' | 'failed';
  workflow?: 'Fridge to Dinner' | 'Weekly Meal Planning' | 'Expiry Automation' | 'Voice to Action';
  details: string;
  createdAt: string;
  durationMs?: number;
}

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface UserPreferences {
  name: string;
  email: string;
  preferredLanguage: string;
  dietaryPreference: string;
  allergies: string[];
  favoriteCuisines: string[];
  cookingExperience: string;
  householdSize: number;
  weeklyBudget: number;
  cookingTimePreference: string;
  nutritionPreference: string;
  avatarUrl?: string;
}

export interface Recommendation {
  recipeId: string;
  reason: string;
}
