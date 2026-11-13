import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PantryItem, PantryItemDocument } from '../pantry/schemas/pantry-item.schema';
import { Recipe, RecipeDocument } from '../recipes/schemas/recipe.schema';
import { MealPlan, MealPlanDocument } from '../meal-planner/schemas/meal-plan.schema';
import { GroceryList, GroceryListDocument } from '../grocery/schemas/grocery-list.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';
import { AutomationJob, AutomationJobDocument } from '../automation/schemas/automation-job.schema';
import { AuthService } from '../auth/auth.service';
import { DEMO_USER_EMAIL } from '../common/constants';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectModel(PantryItem.name) private readonly pantryModel: Model<PantryItemDocument>,
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel(MealPlan.name) private readonly mealPlanModel: Model<MealPlanDocument>,
    @InjectModel(GroceryList.name) private readonly groceryModel: Model<GroceryListDocument>,
    @InjectModel(Notification.name) private readonly notifModel: Model<NotificationDocument>,
    @InjectModel(AutomationJob.name) private readonly jobModel: Model<AutomationJobDocument>,
    private readonly authService: AuthService,
  ) {}

  async getDemoUser() {
    return this.authService.loginDemoUser();
  }

  async loadDemoData() {
    const auth = await this.authService.loginDemoUser();
    const userId = auth.user.id;

    // Clear existing demo data
    await Promise.all([
      this.pantryModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.recipeModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.mealPlanModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.groceryModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.notifModel.deleteMany({ userId: new Types.ObjectId(userId) }),
      this.jobModel.deleteMany({ userId: new Types.ObjectId(userId) }),
    ]);

    // Pantry items with varied expiry
    const now = new Date();
    const pantryItems = await this.pantryModel.insertMany([
      { userId: new Types.ObjectId(userId), name: 'Tomatoes', quantity: 4, unit: 'pcs', category: 'Vegetables', expiryDate: new Date(now.getTime() + 5 * 86400000), addedDate: now, confidence: 0.95 },
      { userId: new Types.ObjectId(userId), name: 'Onions', quantity: 3, unit: 'pcs', category: 'Vegetables', expiryDate: new Date(now.getTime() + 14 * 86400000), addedDate: now, confidence: 0.92 },
      { userId: new Types.ObjectId(userId), name: 'Milk', quantity: 1, unit: 'L', category: 'Dairy', expiryDate: new Date(now.getTime() + 1 * 86400000), addedDate: now, confidence: 0.97 },
      { userId: new Types.ObjectId(userId), name: 'Eggs', quantity: 6, unit: 'pcs', category: 'Dairy', expiryDate: new Date(now.getTime() + 10 * 86400000), addedDate: now, confidence: 0.96 },
      { userId: new Types.ObjectId(userId), name: 'Spinach', quantity: 200, unit: 'g', category: 'Vegetables', expiryDate: new Date(now.getTime() + 2 * 86400000), addedDate: now, confidence: 0.88 },
      { userId: new Types.ObjectId(userId), name: 'Paneer', quantity: 250, unit: 'g', category: 'Dairy', expiryDate: new Date(now.getTime() + 4 * 86400000), addedDate: now, confidence: 0.9 },
      { userId: new Types.ObjectId(userId), name: 'Rice', quantity: 2, unit: 'kg', category: 'Grains', expiryDate: new Date(now.getTime() + 180 * 86400000), addedDate: now },
      { userId: new Types.ObjectId(userId), name: 'Wheat Flour', quantity: 1, unit: 'kg', category: 'Grains', expiryDate: new Date(now.getTime() + 90 * 86400000), addedDate: now },
    ]);

    // Recipes
    const recipes = await this.recipeModel.insertMany([
      {
        userId: new Types.ObjectId(userId),
        title: 'Paneer Tomato Masala',
        description: 'A rich, creamy Indian classic with fresh paneer and juicy tomatoes. [Demo Mode]',
        ingredients: [
          { name: 'Paneer', quantity: 250, unit: 'g' },
          { name: 'Tomatoes', quantity: 4, unit: 'pcs' },
          { name: 'Onions', quantity: 2, unit: 'pcs' },
          { name: 'Cream', quantity: 100, unit: 'ml' },
        ],
        missingIngredients: ['Cream'],
        instructions: [
          { step: 1, text: 'Cube paneer and chop tomatoes and onions.' },
          { step: 2, text: 'Heat oil, sauté onions until golden.' },
          { step: 3, text: 'Add tomatoes, cook until soft, then blend.' },
          { step: 4, text: 'Add paneer and cream, simmer 10 minutes.' },
          { step: 5, text: 'Garnish with coriander and serve hot.' },
        ],
        prepTime: 15, cookingTime: 25, servings: 2, difficulty: 'Easy',
        nutrition: { calories: 420, protein: 22, carbs: 18, fat: 28, fiber: 4 },
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80',
        cuisine: 'Indian', isFavorite: true, isAIGenerated: true,
      },
      {
        userId: new Types.ObjectId(userId),
        title: 'Spinach Omelette',
        description: 'A protein-packed breakfast with fresh spinach. [Demo Mode]',
        ingredients: [
          { name: 'Eggs', quantity: 3, unit: 'pcs' },
          { name: 'Spinach', quantity: 100, unit: 'g' },
          { name: 'Onions', quantity: 1, unit: 'pcs' },
        ],
        missingIngredients: [],
        instructions: [
          { step: 1, text: 'Whisk eggs with salt and pepper.' },
          { step: 2, text: 'Chop spinach and onions.' },
          { step: 3, text: 'Sauté vegetables for 2 minutes.' },
          { step: 4, text: 'Pour eggs, cook on low, fold and serve.' },
        ],
        prepTime: 5, cookingTime: 10, servings: 2, difficulty: 'Easy',
        nutrition: { calories: 280, protein: 20, carbs: 6, fat: 20, fiber: 3 },
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
        cuisine: 'Continental', isFavorite: false, isAIGenerated: true,
      },
      {
        userId: new Types.ObjectId(userId),
        title: 'Quick Tomato Onion Sabzi',
        description: 'A simple, fast Indian side dish. [Demo Mode]',
        ingredients: [
          { name: 'Tomatoes', quantity: 3, unit: 'pcs' },
          { name: 'Onions', quantity: 2, unit: 'pcs' },
        ],
        missingIngredients: ['Cumin seeds', 'Turmeric'],
        instructions: [
          { step: 1, text: 'Chop tomatoes and onions.' },
          { step: 2, text: 'Heat oil, add cumin seeds.' },
          { step: 3, text: 'Add onions, cook until translucent.' },
          { step: 4, text: 'Add tomatoes and spices, cook until mushy.' },
        ],
        prepTime: 10, cookingTime: 15, servings: 2, difficulty: 'Easy',
        nutrition: { calories: 180, protein: 4, carbs: 22, fat: 8, fiber: 5 },
        image: 'https://images.unsplash.com/photo-1606491956682-2e462852c382?w=800&q=80',
        cuisine: 'Indian', isFavorite: false, isAIGenerated: true,
      },
    ]);

    // Meal plan
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const breakfasts = ['Vegetable Poha', 'Masala Oats', 'Upma', 'Besan Chilla', 'Idli Sambar', 'Aloo Paratha', 'Fruit & Yogurt'];
    const lunches = ['Rajma Chawal', 'Paneer Tikka Wrap', 'Dal Tadka & Rice', 'Chole Bhature', 'Vegetable Biryani', 'Palak Paneer & Roti', 'Sambar Rice'];
    const dinners = ['Mixed Veg Sabzi & Roti', 'Paneer Butter Masala', 'Aloo Gobi & Phulka', 'Tomato Dal & Rice', 'Kadai Paneer', 'Mushroom Masala', 'Dal Khichdi'];
    const snacks = ['Masala Chai & Biscuits', 'Roasted Makhana', 'Fruit Salad', 'Samosa', 'Sprouts Chaat', 'Tea & Rusk', 'Peanut Ladoo'];

    const weekStart = new Date(now);
    const dayNum = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayNum + (dayNum === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);

    const mealPlan = await this.mealPlanModel.create({
      userId: new Types.ObjectId(userId),
      weekStartDate: weekStart,
      days: days.map((day, i) => ({
        day,
        meals: [
          { type: 'breakfast', recipeTitle: breakfasts[i], description: 'A nutritious start. [Demo]' },
          { type: 'lunch', recipeTitle: lunches[i], description: 'A balanced midday meal. [Demo]' },
          { type: 'dinner', recipeTitle: dinners[i], description: 'A comforting evening meal. [Demo]' },
          { type: 'snacks', recipeTitle: snacks[i], description: 'A light snack. [Demo]' },
        ],
      })),
      budget: 80,
      preferences: { dietaryPreference: 'Vegetarian', householdSize: 2, nutritionPreference: 'Balanced' },
    });

    // Grocery list
    const groceryList = await this.groceryModel.create({
      userId: new Types.ObjectId(userId),
      items: [
        { _id: new Types.ObjectId(), name: 'Cream', quantity: 100, unit: 'ml', category: 'Dairy', estimatedPrice: 2.5, purchased: false },
        { _id: new Types.ObjectId(), name: 'Cumin seeds', quantity: 1, unit: 'tsp', category: 'Spices', estimatedPrice: 0.5, purchased: false },
        { _id: new Types.ObjectId(), name: 'Turmeric', quantity: 1, unit: 'tsp', category: 'Spices', estimatedPrice: 0.5, purchased: true },
        { _id: new Types.ObjectId(), name: 'Coriander', quantity: 1, unit: 'bunch', category: 'Vegetables', estimatedPrice: 1.0, purchased: false },
      ],
      generatedFrom: 'recipe',
      status: 'active',
      recipeId: recipes[0]._id,
    });

    // Notifications (expiry alerts)
    const notifications = await this.notifModel.insertMany([
      { userId: new Types.ObjectId(userId), title: 'Milk expires in 1 day', message: 'Your Milk (1 L) expires tomorrow. Try making paneer or a milk-based dessert!', type: 'expiry', read: false, relatedType: 'pantry_expiry', relatedItemId: pantryItems[2]._id },
      { userId: new Types.ObjectId(userId), title: 'Spinach expires in 2 days', message: 'Your Spinach (200 g) is expiring soon. Suggested: Spinach Omelette, Palak Paneer.', type: 'expiry', read: false, relatedType: 'pantry_expiry', relatedItemId: pantryItems[4]._id },
      { userId: new Types.ObjectId(userId), title: 'Meal plan generated', message: 'Your weekly meal plan is ready. 28 meals across 7 days.', type: 'meal_plan', read: true },
    ]);

    // Automation history
    const jobs = await this.jobModel.insertMany([
      { userId: new Types.ObjectId(userId), jobType: 'fridge_scan', status: 'completed', executionDetails: { ingredientsDetected: 6 }, startedAt: new Date(now.getTime() - 3600000), completedAt: new Date(now.getTime() - 3540000) },
      { userId: new Types.ObjectId(userId), jobType: 'meal_plan_generate', status: 'completed', executionDetails: { daysCount: 7 }, startedAt: new Date(now.getTime() - 7200000), completedAt: new Date(now.getTime() - 7150000) },
      { userId: new Types.ObjectId(userId), jobType: 'grocery_generate', status: 'completed', executionDetails: { addedItems: 4, source: 'recipe' }, startedAt: new Date(now.getTime() - 7100000), completedAt: new Date(now.getTime() - 7050000) },
      { userId: new Types.ObjectId(userId), jobType: 'expiry_check', status: 'completed', executionDetails: { checked: 8, notified: 2 }, startedAt: new Date(now.getTime() - 1800000), completedAt: new Date(now.getTime() - 1790000) },
      { userId: new Types.ObjectId(userId), jobType: 'voice_action', status: 'completed', executionDetails: { transcript: 'Suggest a healthy breakfast', tool: 'generate_recipes' }, startedAt: new Date(now.getTime() - 900000), completedAt: new Date(now.getTime() - 890000) },
    ]);

    this.logger.log(`Demo data loaded for user ${userId}`);

    return {
      accessToken: auth.accessToken,
      user: auth.user,
      data: {
        pantry: pantryItems.length,
        recipes: recipes.length,
        mealPlan: 1,
        groceryList: 1,
        notifications: notifications.length,
        automationJobs: jobs.length,
      },
      demoMode: true,
    };
  }

  async getDemoStatus() {
    return {
      demoMode: true,
      demoUserEmail: DEMO_USER_EMAIL,
      message: 'Demo mode active. All AI features return realistic simulated data. Configure GEMINI_API_KEY and SARVAM_API_KEY to enable real AI processing.',
    };
  }
}
