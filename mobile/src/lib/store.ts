import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AppNotification,
  AutomationJob,
  GroceryItem,
  GroceryList,
  MealPlan,
  PantryItem,
  Recipe,
  RecipeFilters,
  ScannedIngredient,
  UserPreferences,
  VoiceMessage,
} from '@/types';
import { uid } from '@/lib/utils';

type State = {
  user: UserPreferences | null;
  onboarded: boolean;
  recipes: Recipe[];
  pantry: PantryItem[];
  mealPlan: MealPlan | null;
  groceryList: GroceryList | null;
  notifications: AppNotification[];
  automationJobs: AutomationJob[];
  voiceHistory: VoiceMessage[];
  recentRecipeIds: string[];
  savedFridgeScan: ScannedIngredient[] | null;
  lastPlannerInput: {
    budget: number;
    dietaryPreference: string;
    householdSize: number;
    availableIngredients: string;
    nutritionPreference: string;
  } | null;
  lastGenerationFilters: RecipeFilters | null;
  setUser: (user: UserPreferences | null) => void;
  completeOnboarding: () => void;
  toggleFavorite: (id: string) => void;
  markViewed: (id: string) => void;
  addRecipes: (recipes: Recipe[]) => void;
  updateRecipe: (recipe: Recipe) => void;
  savePantryItems: (items: PantryItem[]) => void;
  deletePantryItem: (id: string) => void;
  updatePantryItem: (item: PantryItem) => void;
  setFridgeScan: (items: ScannedIngredient[] | null) => void;
  setMealPlan: (plan: MealPlan | null) => void;
  setGroceryList: (list: GroceryList | null) => void;
  toggleGroceryItem: (id: string) => void;
  addGroceryItems: (items: GroceryItem[]) => void;
  removeGroceryItem: (id: string) => void;
  updateGroceryItemQty: (id: string, quantity: number) => void;
  logAutomation: (job: Omit<AutomationJob, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addVoiceMessage: (message: VoiceMessage) => void;
  clearVoiceHistory: () => void;
  reset: () => void;
};

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      onboarded: false,
      recipes: [],
      pantry: [],
      mealPlan: null,
      groceryList: null,
      notifications: [],
      automationJobs: [],
      voiceHistory: [],
      recentRecipeIds: [],
      savedFridgeScan: null,
      lastPlannerInput: null,
      lastGenerationFilters: null,
      setUser: (user) => set({ user }),
      completeOnboarding: () => set({ onboarded: true }),
      toggleFavorite: (id) => set((state) => ({ recipes: state.recipes.map((recipe) => recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe) })),
      markViewed: (id) => set((state) => ({ recentRecipeIds: [id, ...state.recentRecipeIds.filter((item) => item !== id)].slice(0, 6) })),
      addRecipes: (recipes) => set((state) => ({ recipes: [...recipes, ...state.recipes] })),
      updateRecipe: (recipe) => set((state) => ({ recipes: state.recipes.map((item) => item.id === recipe.id ? recipe : item) })),
      savePantryItems: (items) => set((state) => {
        const existing = new Map(state.pantry.map((item) => [item.name.toLowerCase(), item]));
        items.forEach((item) => {
          const prior = existing.get(item.name.toLowerCase());
          existing.set(item.name.toLowerCase(), prior
            ? { ...prior, quantity: prior.quantity + item.quantity, expiryDate: item.expiryDate ?? prior.expiryDate }
            : item);
        });
        return { pantry: Array.from(existing.values()) };
      }),
      deletePantryItem: (id) => set((state) => ({ pantry: state.pantry.filter((item) => item.id !== id) })),
      updatePantryItem: (item) => set((state) => ({ pantry: state.pantry.map((entry) => entry.id === item.id ? item : entry) })),
      setFridgeScan: (savedFridgeScan) => set({ savedFridgeScan }),
      setMealPlan: (mealPlan) => set({ mealPlan }),
      setGroceryList: (groceryList) => set({ groceryList }),
      toggleGroceryItem: (id) => set((state) => ({
        groceryList: state.groceryList && {
          ...state.groceryList,
          items: state.groceryList.items.map((item) => item.id === id ? { ...item, purchased: !item.purchased } : item),
        },
      })),
      addGroceryItems: (items) => set((state) => ({
        groceryList: state.groceryList
          ? { ...state.groceryList, items: [...state.groceryList.items, ...items] }
          : { id: uid('gl'), items, generatedFrom: 'Manual add', status: 'active', createdAt: new Date().toISOString() },
      })),
      removeGroceryItem: (id) => set((state) => ({
        groceryList: state.groceryList && { ...state.groceryList, items: state.groceryList.items.filter((item) => item.id !== id) },
      })),
      updateGroceryItemQty: (id, quantity) => set((state) => ({
        groceryList: state.groceryList && {
          ...state.groceryList,
          items: state.groceryList.items.map((item) => item.id === id ? { ...item, quantity } : item),
        },
      })),
      logAutomation: (job) => set((state) => ({
        automationJobs: [{ ...job, id: uid('job'), createdAt: new Date().toISOString() }, ...state.automationJobs].slice(0, 30),
      })),
      markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map((item) => item.id === id ? { ...item, read: true } : item) })),
      markAllNotificationsRead: () => set((state) => ({ notifications: state.notifications.map((item) => ({ ...item, read: true })) })),
      addVoiceMessage: (message) => set((state) => ({ voiceHistory: [...state.voiceHistory, message].slice(-40) })),
      clearVoiceHistory: () => set({ voiceHistory: [] }),
      reset: () => set({
        user: null,
        onboarded: false,
        recipes: [],
        pantry: [],
        mealPlan: null,
        groceryList: null,
        notifications: [],
        automationJobs: [],
        voiceHistory: [],
        recentRecipeIds: [],
        savedFridgeScan: null,
        lastPlannerInput: null,
        lastGenerationFilters: null,
      }),
    }),
    { name: 'chefmate-ai-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export type MealPlannerInput = NonNullable<State['lastPlannerInput']>;
