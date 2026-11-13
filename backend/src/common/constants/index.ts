export enum PantryCategory {
  VEGETABLES = 'Vegetables',
  FRUITS = 'Fruits',
  DAIRY = 'Dairy',
  GRAINS = 'Grains',
  SPICES = 'Spices',
  MEAT_SEAFOOD = 'Meat & Seafood',
  OTHER = 'Other',
}

export enum GroceryCategory {
  VEGETABLES = 'Vegetables',
  FRUITS = 'Fruits',
  DAIRY = 'Dairy',
  GRAINS = 'Grains',
  SPICES = 'Spices',
  MEAT_SEAFOOD = 'Meat & Seafood',
  OTHER = 'Other',
}

export enum NotificationType {
  EXPIRY = 'expiry',
  MEAL_PLAN = 'meal_plan',
  GROCERY = 'grocery',
  VOICE = 'voice',
  SYSTEM = 'system',
}

export enum AutomationJobType {
  EXPIRY_CHECK = 'expiry_check',
  GROCERY_GENERATE = 'grocery_generate',
  MEAL_PLAN_GENERATE = 'meal_plan_generate',
  VOICE_ACTION = 'voice_action',
  FRIDGE_SCAN = 'fridge_scan',
}

export enum AutomationJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CookingSessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export const DEMO_USER_EMAIL = 'demo@chefmate.ai';
export const DEMO_USER_PASSWORD = 'chefmate123';

export const SUPPORTED_LANGUAGES = [
  'en-IN',
  'hi-IN',
  'ta-IN',
  'te-IN',
  'kn-IN',
  'ml-IN',
  'mr-IN',
  'bn-IN',
  'gu-IN',
  'pa-IN',
  'or-IN',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
