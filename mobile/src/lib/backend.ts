import type {
  AppNotification,
  AutomationJob,
  Category,
  DayPlan,
  GroceryItem,
  GroceryList,
  Ingredient,
  MealPlan,
  MealSlot,
  MealType,
  Nutrition,
  PantryItem,
  Recipe,
  ScannedIngredient,
  Unit,
  UserPreferences,
} from '@/types';
import { api, ApiError } from '@/lib/api';
import { secureSession } from '@/lib/secureSession';
import { useAppStore, type MealPlannerInput } from '@/lib/store';
import { categoryFor } from '@/lib/demoData';
import { recipeImageForTitle } from '@/lib/images';
import { uid } from '@/lib/utils';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function idOf(value: RecordValue): string {
  return text(value.id, text(value._id));
}

function collection(value: unknown, keys: string[] = []): unknown[] {
  if (Array.isArray(value)) return value;
  const source = record(value);
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  return [];
}

function unitOf(value: unknown): Unit {
  const allowed: Unit[] = ['pcs', 'g', 'kg', 'ml', 'L', 'tbsp', 'tsp', 'cup', 'pack'];
  return allowed.includes(value as Unit) ? value as Unit : 'pcs';
}

function categoryOf(value: unknown, name: string): Category {
  const allowed: Category[] = ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Spices', 'Meat & Seafood', 'Other'];
  return allowed.includes(value as Category) ? value as Category : categoryFor(name);
}

function nutritionOf(value: unknown): Nutrition {
  const source = record(value);
  return {
    calories: number(source.calories),
    protein: number(source.protein),
    carbs: number(source.carbs),
    fat: number(source.fat),
    fiber: number(source.fiber),
  };
}

function ingredientsOf(value: unknown): Ingredient[] {
  return list(value).map((item) => {
    const source = record(item);
    return { name: text(source.name), quantity: number(source.quantity, 1), unit: unitOf(source.unit) };
  }).filter((item) => item.name.length > 0);
}

function instructionsOf(value: unknown): string[] {
  return list(value).map((item) => typeof item === 'string'
    ? item
    : text(record(item).instruction, text(record(item).text))).filter(Boolean);
}

export function recipeFromBackend(value: unknown, existing?: Recipe): Recipe {
  const source = record(value);
  const nutrition = nutritionOf(source.nutrition ?? existing?.nutrition);
  const difficulty = text(source.difficulty, existing?.difficulty ?? 'Easy');
  return {
    id: idOf(source) || existing?.id || uid('recipe'),
    title: text(source.title, existing?.title ?? 'Untitled recipe'),
    description: text(source.description, existing?.description ?? ''),
    image: text(source.image, text(source.imageUrl, existing?.image ?? '')),
    ingredients: ingredientsOf(source.ingredients ?? existing?.ingredients),
    instructions: instructionsOf(source.instructions ?? existing?.instructions),
    prepTime: number(source.prepTime, existing?.prepTime ?? 0),
    cookingTime: number(source.cookingTime, existing?.cookingTime ?? 0),
    servings: number(source.servings, existing?.servings ?? 2),
    difficulty: difficulty === 'Medium' || difficulty === 'Hard' ? difficulty : 'Easy',
    cuisine: text(source.cuisine, existing?.cuisine ?? ''),
    dietaryTags: list(source.dietaryTags ?? source.dietaryRestrictions ?? existing?.dietaryTags).filter((tag): tag is string => typeof tag === 'string'),
    nutrition,
    estimatedPrice: number(source.estimatedPrice, existing?.estimatedPrice ?? 0),
    isFavorite: typeof source.isFavorite === 'boolean' ? source.isFavorite : existing?.isFavorite ?? false,
    createdAt: text(source.createdAt, existing?.createdAt ?? new Date().toISOString()),
  };
}

function pantryItemFromBackend(value: unknown): PantryItem {
  const source = record(value);
  const name = text(source.name, 'Ingredient');
  return {
    id: idOf(source) || uid('pantry'),
    name,
    quantity: number(source.quantity, 1),
    unit: unitOf(source.unit),
    category: categoryOf(source.category, name),
    expiryDate: text(source.expiryDate) || undefined,
    addedAt: text(source.addedAt, text(source.createdAt, new Date().toISOString())),
  };
}

function groceryItemFromBackend(value: unknown): GroceryItem {
  const source = record(value);
  const name = text(source.name, 'Ingredient');
  return {
    id: idOf(source) || uid('grocery'),
    name,
    quantity: number(source.quantity, 1),
    unit: unitOf(source.unit),
    category: categoryOf(source.category, name),
    estimatedPrice: number(source.estimatedPrice),
    purchased: Boolean(source.purchased),
  };
}

function groceryListFromBackend(value: unknown): GroceryList | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const outer = record(value);
  if (('groceryList' in outer && !outer.groceryList) || ('list' in outer && !outer.list)) return null;
  const source = record(outer.groceryList ?? outer.list ?? value);
  return {
    id: idOf(source) || uid('list'),
    items: collection(source.items).map(groceryItemFromBackend),
    generatedFrom: text(source.generatedFrom, 'ChefMate grocery list'),
    status: source.status === 'completed' ? 'completed' : 'active',
    createdAt: text(source.createdAt, new Date().toISOString()),
  };
}

function mealSlotFromBackend(value: unknown): MealSlot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = record(value);
  const recipe = record(source.recipe);
  const nutrition = nutritionOf(source.nutrition ?? recipe.nutrition);
  const recipeId = text(source.recipeId, idOf(recipe));
  const title = text(source.title, text(source.recipeTitle, text(recipe.title)));
  if (!recipeId && !title) return undefined;
  return {
    recipeId,
    title: title || 'Meal',
    image: text(source.image) || text(source.imageUrl) || text(recipe.image) || text(recipe.imageUrl) || recipeImageForTitle(title),
    cookingTime: number(source.cookingTime, number(recipe.cookingTime)),
    nutrition,
    description: text(source.description, text(recipe.description)) || undefined,
  };
}

function mealTypeOf(value: string): MealType | undefined {
  const normalized = value.toLowerCase();
  if (normalized === 'breakfast') return 'Breakfast';
  if (normalized === 'lunch') return 'Lunch';
  if (normalized === 'dinner') return 'Dinner';
  if (normalized === 'snacks' || normalized === 'snack') return 'Snacks';
  return undefined;
}

function dayPlanFromBackend(value: unknown, index: number): DayPlan {
  const source = record(value);
  const rawMeals = source.meals;
  const mealEntries: [string, unknown][] = Array.isArray(rawMeals)
    ? rawMeals.map((meal) => [text(record(meal).type), meal])
    : Object.entries(record(rawMeals));
  const meals: Partial<Record<MealType, MealSlot>> = {};
  mealEntries.forEach(([key, meal]) => {
    const type = mealTypeOf(key);
    const slot = mealSlotFromBackend(meal);
    if (type && slot) meals[type] = slot;
  });
  return { day: text(source.day, text(source.name, `Day ${index + 1}`)), meals };
}

export function mealPlanFromBackend(value: unknown): MealPlan | null {
  if (!value || typeof value !== 'object') return null;
  const source = record(value);
  const preferences = record(source.preferences);
  const daysValue = source.days;
  const dayEntries = Array.isArray(daysValue)
    ? daysValue
    : Object.entries(record(daysValue)).map(([day, meals]) => ({ day, meals }));
  const days = dayEntries.map(dayPlanFromBackend);
  return {
    id: idOf(source) || uid('plan'),
    weekStartDate: text(source.weekStartDate, text(source.startDate, '')),
    days,
    budget: number(source.budget),
    dietaryPreference: text(source.dietaryPreference, text(preferences.dietaryPreference)),
    householdSize: number(source.householdSize, number(preferences.householdSize, 1)),
    createdAt: text(source.createdAt, new Date().toISOString()),
  };
}

function languageLabel(value: string): string {
  const languages: Record<string, string> = {
    'en-IN': 'English',
    'en-US': 'English',
    'hi-IN': 'Hindi (हिन्दी)',
    'ta-IN': 'Tamil (தமிழ்)',
    'te-IN': 'Telugu (తెలుగు)',
    'kn-IN': 'Kannada (ಕನ್ನಡ)',
    'mr-IN': 'Marathi (मराठी)',
    'bn-IN': 'Bengali (বাংলা)',
  };
  return languages[value] ?? value;
}

function languageCode(value: string): string {
  const languages: Record<string, string> = {
    English: 'en-IN',
    'Hindi (हिन्दी)': 'hi-IN',
    'Tamil (தமிழ்)': 'ta-IN',
    'Telugu (తెలుగు)': 'te-IN',
    'Kannada (ಕನ್ನಡ)': 'kn-IN',
    'Marathi (मराठी)': 'mr-IN',
    'Bengali (বাংলা)': 'bn-IN',
  };
  return languages[value] ?? value;
}

export function userFromBackend(value: unknown): UserPreferences {
  const source = record(value);
  const preferences = record(source.preferences);
  const dietary = text(preferences.dietaryPreference, list(source.dietaryRestrictions).filter((item): item is string => typeof item === 'string').join(', ') || 'No restrictions');
  const allergies = list(source.allergies ?? preferences.allergies).filter((item): item is string => typeof item === 'string');
  return {
    name: text(source.name, 'ChefMate user'),
    email: text(source.email),
    preferredLanguage: languageLabel(text(source.preferredLanguage, 'English')),
    dietaryPreference: dietary,
    allergies,
    favoriteCuisines: list(preferences.favoriteCuisines).filter((item): item is string => typeof item === 'string'),
    cookingExperience: text(preferences.cookingExperience, 'Beginner'),
    householdSize: number(preferences.householdSize, 2),
    weeklyBudget: number(preferences.weeklyBudget, 60),
    cookingTimePreference: text(preferences.cookingTimePreference, '30 minutes'),
    nutritionPreference: text(preferences.nutritionPreference, 'Balanced'),
    avatarUrl: text(source.avatarUrl) || undefined,
  };
}

function notificationFromBackend(value: unknown): AppNotification {
  const source = record(value);
  const rawType = text(source.type, 'system');
  const type: AppNotification['type'] = rawType === 'expiry' || rawType === 'plan' || rawType === 'automation' ? rawType : 'system';
  return {
    id: idOf(source) || uid('notification'),
    title: text(source.title, 'ChefMate update'),
    message: text(source.message, text(source.body)),
    type,
    read: Boolean(source.read ?? source.isRead),
    createdAt: text(source.createdAt, new Date().toISOString()),
  };
}

function automationFromBackend(value: unknown): AutomationJob {
  const source = record(value);
  const jobNames: AutomationJob['jobType'][] = ['Fridge Scan', 'Recipe Generation', 'Meal Plan Generation', 'Grocery Generation', 'Expiry Check', 'Voice Command'];
  const workflowNames: NonNullable<AutomationJob['workflow']>[] = ['Fridge to Dinner', 'Weekly Meal Planning', 'Expiry Automation', 'Voice to Action'];
  const rawJobType = text(source.jobType, text(source.type));
  const jobKey = rawJobType.toLowerCase().replace(/[_-]/g, ' ');
  const jobType = jobNames.find((name) => name.toLowerCase() === jobKey) ?? ({
    'fridge scan': 'Fridge Scan',
    'recipe generation': 'Recipe Generation',
    'meal plan generation': 'Meal Plan Generation',
    'grocery generation': 'Grocery Generation',
    'expiry check': 'Expiry Check',
    'voice command': 'Voice Command',
  } as Record<string, AutomationJob['jobType']>)[jobKey] ?? rawJobType;
  const rawWorkflow = text(source.workflow);
  const workflowKey = rawWorkflow.toLowerCase().replace(/[_-]/g, ' ');
  const workflow = workflowNames.find((name) => name.toLowerCase() === workflowKey) ?? rawWorkflow;
  const rawStatus = text(source.status);
  return {
    id: idOf(source) || uid('job'),
    jobType: jobNames.includes(jobType as AutomationJob['jobType']) ? jobType as AutomationJob['jobType'] : 'Expiry Check',
    status: rawStatus === 'queued' || rawStatus === 'running' || rawStatus === 'failed' ? rawStatus : 'completed',
    workflow: workflowNames.includes(workflow as NonNullable<AutomationJob['workflow']>) ? workflow as NonNullable<AutomationJob['workflow']> : undefined,
    details: text(source.details, text(source.message)),
    createdAt: text(source.createdAt, new Date().toISOString()),
    durationMs: number(source.durationMs, number(source.duration)),
  };
}

type AuthResponse = { accessToken?: string; user?: unknown };

async function establishSession(path: string, body?: unknown): Promise<UserPreferences> {
  const result = await api.post<AuthResponse>(path, body, false);
  if (!result?.accessToken) throw new ApiError('Sign-in did not return an access token.');
  await secureSession.saveToken(result.accessToken);
  useAppStore.getState().reset();
  const user = userFromBackend(result.user);
  useAppStore.setState({ user });
  return user;
}

export async function login(email: string, password: string): Promise<UserPreferences> {
  return establishSession('/api/auth/login', { email, password });
}

export async function register(name: string, email: string, password: string): Promise<UserPreferences> {
  return establishSession('/api/auth/register', { name, email, password });
}

export async function loginDemo(): Promise<UserPreferences> {
  const user = await establishSession('/api/auth/demo-login');
  try {
    await api.post('/api/demo/load-data');
    await loadBackendState();
    return user;
  } catch (error) {
    await logout();
    throw error;
  }
}

export async function logout(): Promise<void> {
  await secureSession.clearToken();
  useAppStore.getState().reset();
  await useAppStore.persist.clearStorage();
}

export async function loadBackendState(): Promise<void> {
  const [user, pantry, recipes, grocery, mealPlans, notifications, history] = await Promise.all([
    api.get<unknown>('/api/users/me'),
    api.get<unknown>('/api/pantry'),
    api.get<unknown>('/api/recipes'),
    api.get<unknown>('/api/grocery'),
    api.get<unknown>('/api/meal-planner'),
    api.get<unknown>('/api/notifications'),
    api.get<unknown>('/api/automation/history'),
  ]);
  const plans = collection(mealPlans, ['items', 'plans']);
  const planCandidate = plans.length
    ? plans[0]
    : record(mealPlans).plan ?? (record(mealPlans).days ? mealPlans : null);
  useAppStore.setState({
    user: userFromBackend(user),
    onboarded: true,
    pantry: collection(pantry, ['items']).map(pantryItemFromBackend),
    recipes: collection(recipes, ['items', 'recipes']).map((item) => recipeFromBackend(item)),
    groceryList: groceryListFromBackend(grocery),
    mealPlan: mealPlanFromBackend(planCandidate),
    notifications: collection(notifications, ['items']).map(notificationFromBackend),
    automationJobs: collection(record(history).items).map(automationFromBackend),
  });
}

export async function updateBackendProfile(user: UserPreferences, notificationToken?: string): Promise<UserPreferences> {
  const payload = {
    name: user.name,
    preferredLanguage: languageCode(user.preferredLanguage),
    ...(notificationToken ? { notificationToken } : {}),
    allergies: user.allergies,
    dietaryRestrictions: user.dietaryPreference === 'No restrictions' ? [] : [user.dietaryPreference],
    preferences: {
      dietaryPreference: user.dietaryPreference,
      allergies: user.allergies,
      favoriteCuisines: user.favoriteCuisines,
      cookingExperience: user.cookingExperience,
      householdSize: user.householdSize,
      weeklyBudget: user.weeklyBudget,
      cookingTimePreference: user.cookingTimePreference,
      nutritionPreference: user.nutritionPreference,
    },
  };
  const updated = await api.patch<unknown>('/api/users/me', payload);
  const responseUser = record(record(updated).user ?? updated);
  const mapped = userFromBackend({
    ...user,
    ...responseUser,
    preferences: { ...user, ...record(responseUser.preferences) },
  });
  useAppStore.getState().setUser(mapped);
  return mapped;
}

export async function scanFridgeImage(uri: string): Promise<ScannedIngredient[]> {
  const result = await api.upload<unknown>('/api/pantry/scan', uri);
  return collection(result, ['ingredients', 'detectedIngredients', 'items']).map((value) => {
    const source = record(value);
    const name = text(source.name, 'Ingredient');
    return {
      id: idOf(source) || uid('scan'),
      name,
      quantity: number(source.quantity, 1),
      unit: unitOf(source.unit),
      confidence: number(source.confidence),
      expiryDate: text(source.expiryDate) || undefined,
      selected: source.selected === false ? false : true,
    };
  });
}

export async function confirmScannedIngredients(items: ScannedIngredient[]): Promise<void> {
  await api.post('/api/pantry/batch', {
    ingredients: items.map(({ name, quantity, unit, expiryDate }) => ({ name, quantity, unit, expiryDate })),
  });
  await refreshPantry();
}

export async function addPantryItem(item: Omit<PantryItem, 'id' | 'addedAt'>): Promise<void> {
  await api.post('/api/pantry', item);
  await refreshPantry();
}

export async function updatePantryItem(item: PantryItem): Promise<void> {
  await api.patch(`/api/pantry/${encodeURIComponent(item.id)}`, {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    expiryDate: item.expiryDate,
  });
  await refreshPantry();
}

export async function deletePantryItem(id: string): Promise<void> {
  await api.delete(`/api/pantry/${encodeURIComponent(id)}`);
  await refreshPantry();
}

export async function refreshPantry(): Promise<void> {
  const pantry = await api.get<unknown>('/api/pantry');
  useAppStore.setState({ pantry: collection(pantry, ['items']).map(pantryItemFromBackend) });
}

export async function generateRecipes(filters: {
  ingredients: string[];
  cuisine: string;
  dietaryPreference: string;
  maxCookingTime: number;
  difficulty: string;
  budget: number;
  servings: number;
}): Promise<Recipe[]> {
  const result = await api.post<unknown>('/api/recipes/generate', {
    ingredients: filters.ingredients,
    cuisine: filters.cuisine === 'Any' ? undefined : filters.cuisine,
    dietaryPreference: filters.dietaryPreference === 'Any' ? undefined : filters.dietaryPreference,
    cookingTime: filters.maxCookingTime,
    difficulty: filters.difficulty === 'Any' ? undefined : filters.difficulty,
    budget: filters.budget,
    servings: filters.servings,
  });
  const recipes = collection(result, ['recipes', 'generatedRecipes', 'items']).map((item) => recipeFromBackend(item));
  if (!recipes.length) throw new ApiError('No generated recipes were returned.');
  return recipes;
}

export async function modifyRecipe(recipe: Recipe, instruction: string): Promise<Recipe> {
  const result = await api.post<unknown>(`/api/recipes/${encodeURIComponent(recipe.id)}/modify`, { instruction });
  const response = record(result);
  const candidate = response.recipe ?? response.modifiedRecipe ?? result;
  const recipeRecord = record(candidate);
  if (!('title' in recipeRecord) && !('ingredients' in recipeRecord) && !('instructions' in recipeRecord)) {
    const refreshed = await api.get<unknown>(`/api/recipes/${encodeURIComponent(recipe.id)}`);
    return recipeFromBackend(record(refreshed).recipe ?? refreshed, recipe);
  }
  return recipeFromBackend(candidate, recipe);
}

export async function setRecipeFavorite(recipe: Recipe): Promise<void> {
  const isFavorite = !recipe.isFavorite;
  const result = await api.post<unknown>(`/api/recipes/${encodeURIComponent(recipe.id)}/favorite`, { isFavorite });
  const updated = record(result).recipe ?? result;
  useAppStore.getState().updateRecipe(recipeFromBackend({ ...record(updated), isFavorite }, { ...recipe, isFavorite }));
}

export async function analyzeRecipeNutrition(recipe: Recipe): Promise<unknown> {
  const result = await api.post<unknown>('/api/nutrition/analyze', {
    recipeTitle: recipe.title,
    ingredients: recipe.ingredients,
    servings: recipe.servings,
    recipeId: recipe.id,
  });
  const response = record(result);
  return response.nutrition ?? response.analysis ?? result;
}

export async function generateMealPlan(input: MealPlannerInput): Promise<MealPlan> {
  const result = await api.post<unknown>('/api/meal-planner/generate', {
    budget: input.budget,
    dietaryPreference: input.dietaryPreference,
    householdSize: input.householdSize,
    availableIngredients: input.availableIngredients.split(',').map((item) => item.trim()).filter(Boolean),
    nutritionPreference: input.nutritionPreference,
  });
  const plan = mealPlanFromBackend(record(result).mealPlan ?? result);
  if (!plan) throw new ApiError('No meal plan was returned.');
  return plan;
}

export async function updateMealPlan(plan: MealPlan): Promise<MealPlan> {
  const days = plan.days.map((day) => ({
    day: day.day,
    meals: Object.entries(day.meals).map(([type, meal]) => ({
      type: type.toLowerCase(),
      recipeTitle: meal.title,
      ...(meal.recipeId ? { recipeId: meal.recipeId } : {}),
    })),
  }));
  const result = await api.patch<unknown>(`/api/meal-planner/${encodeURIComponent(plan.id)}`, {
    days,
    budget: plan.budget,
  });
  const candidate = record(result).mealPlan ?? result;
  if (record(candidate).days) return mealPlanFromBackend(candidate) ?? plan;
  const refreshed = await api.get<unknown>(`/api/meal-planner/${encodeURIComponent(plan.id)}`);
  return mealPlanFromBackend(record(refreshed).mealPlan ?? refreshed) ?? plan;
}

export async function generateGroceryForPlan(plan: MealPlan): Promise<void> {
  await api.post(`/api/meal-planner/${encodeURIComponent(plan.id)}/grocery`);
  await refreshGroceryList();
}

export async function generateGroceryForRecipe(recipe: Recipe): Promise<void> {
  await api.post(`/api/recipes/${encodeURIComponent(recipe.id)}/grocery`);
  await refreshGroceryList();
}

export async function addGroceryItems(items: Omit<GroceryItem, 'id'>[]): Promise<void> {
  for (const { name, quantity, unit, category, estimatedPrice } of items) {
    await api.post('/api/grocery/items', { name, quantity, unit, category, estimatedPrice });
  }
  await refreshGroceryList();
}

export async function updateGroceryItem(id: string, patch: Partial<GroceryItem>): Promise<void> {
  const { id: _id, ...body } = patch;
  await api.patch(`/api/grocery/items/${encodeURIComponent(id)}`, body);
  await refreshGroceryList();
}

export async function removeGroceryItem(id: string): Promise<void> {
  await api.delete(`/api/grocery/items/${encodeURIComponent(id)}`);
  await refreshGroceryList();
}

export async function refreshGroceryList(): Promise<void> {
  const grocery = await api.get<unknown>('/api/grocery');
  useAppStore.setState({ groceryList: groceryListFromBackend(grocery) });
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`);
  await refreshNotifications();
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/api/notifications/read-all');
  await refreshNotifications();
}

export async function refreshNotifications(): Promise<void> {
  const notifications = await api.get<unknown>('/api/notifications');
  useAppStore.setState({ notifications: collection(notifications, ['items']).map(notificationFromBackend) });
}

export async function refreshBackendActivity(): Promise<void> {
  const [history, notifications] = await Promise.all([
    api.get<unknown>('/api/automation/history'),
    api.get<unknown>('/api/notifications'),
  ]);
  useAppStore.setState({
    automationJobs: collection(record(history).items).map(automationFromBackend),
    notifications: collection(notifications, ['items']).map(notificationFromBackend),
  });
}

export async function runBackendExpiryCheck(): Promise<void> {
  await api.post('/api/automation/expiry-check');
  await refreshBackendActivity();
}

export async function transcribeAudio(audio: string, language: string): Promise<string> {
  const result = record(await api.post<unknown>('/api/voice/transcribe', { audio, language }));
  const transcript = text(result.transcript, text(result.transcription, text(result.text)));
  if (!transcript) throw new ApiError('No transcript was returned.');
  return transcript;
}

export type VoiceResponse = { reply: string; action?: RecordValue | null; actionLabel?: string };

export async function respondToVoice(textValue: string, language: string, context: Record<string, unknown>): Promise<VoiceResponse> {
  const result = record(await api.post<unknown>('/api/voice/respond', { text: textValue, language, context }));
  const directAction = record(result.action);
  const action = Object.keys(directAction).length > 0
    ? directAction
    : list(result.executionResults).map(record).find((item) => item.success) ?? list(result.toolCalls).map(record)[0] ?? null;
  const reply = [
    result.reply,
    result.response,
    result.answer,
    result.message,
    result.textResponse,
    action?.spokenResponse,
  ].find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0) ?? '';
  if (!reply) throw new ApiError('No voice response was returned.');
  return {
    reply,
    action,
    actionLabel: [
      result.actionLabel,
      action?.actionLabel,
      action?.message,
      action?.tool,
    ].find((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0),
  };
}

export async function speakWithBackend(
  textValue: string,
  language: string,
): Promise<{ audioBase64: string; demoMode: boolean }> {
  const result = record(await api.post<unknown>('/api/voice/speak', { text: textValue, language }));
  const audioBase64 = text(result.audioBase64);
  if (!audioBase64) throw new ApiError('Voice unavailable. No speech audio was returned.');
  return { audioBase64, demoMode: Boolean(result.demoMode) };
}

export async function getDailyNutritionSummary(): Promise<unknown> {
  return api.get('/api/nutrition/daily-summary');
}

export async function startCookingSession(recipeId: string): Promise<string | undefined> {
  const result = record(await api.post('/api/voice/cooking/start', { recipeId }));
  const session = record(result.session ?? result.cookingSession ?? result);
  return idOf(session) || text(session.sessionId) || undefined;
}

export async function nextCookingStep(): Promise<unknown> {
  return api.post('/api/voice/cooking/next-step');
}

export async function updateCookingSession(id: string, currentStep: number, status?: string): Promise<void> {
  await api.patch(`/api/voice/cooking/${encodeURIComponent(id)}`, { currentStep, status });
}

export async function replaceMealWithGenerated(plan: MealPlan, dayIndex: number, mealType: MealType): Promise<MealPlan> {
  const day = plan.days[dayIndex];
  if (!day) throw new ApiError('The selected day is not in this meal plan.');
  const input = useAppStore.getState().lastPlannerInput ?? {
    budget: plan.budget,
    dietaryPreference: plan.dietaryPreference || 'No restrictions',
    householdSize: plan.householdSize,
    availableIngredients: '',
    nutritionPreference: 'Balanced',
  };
  const result = record(await api.post<unknown>(
    `/api/meal-planner/${encodeURIComponent(plan.id)}/replace-meal`,
    {
      day: day.day,
      mealType: mealType.toLowerCase(),
      preferences: {
        budget: input.budget,
        dietaryPreference: input.dietaryPreference,
        householdSize: input.householdSize,
        availableIngredients: input.availableIngredients.split(',').map((item) => item.trim()).filter(Boolean),
        nutritionPreference: input.nutritionPreference,
      },
    },
  ));
  const updated = mealPlanFromBackend(result.plan);
  if (!updated) throw new ApiError('The replacement was generated, but the updated meal plan was not returned.');
  useAppStore.getState().setMealPlan(updated);
  return updated;
}

export async function regeneratePlanDay(plan: MealPlan, dayIndex: number): Promise<MealPlan> {
  const input = useAppStore.getState().lastPlannerInput ?? {
    budget: plan.budget,
    dietaryPreference: plan.dietaryPreference,
    householdSize: plan.householdSize,
    availableIngredients: '',
    nutritionPreference: 'Balanced',
  };
  const generated = await generateMealPlan(input);
  const replacement = generated.days[dayIndex];
  if (!replacement) throw new ApiError('No replacement day was returned.');
  const days = plan.days.map((day, index) => index === dayIndex ? replacement : day);
  const updated = await updateMealPlan({ ...plan, days });
  useAppStore.getState().setMealPlan(updated);
  return updated;
}

