import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GroceryList, GroceryListDocument, GroceryItem } from './schemas/grocery-list.schema';
import { AddGroceryItemDto, UpdateGroceryItemDto } from './dto/grocery.dto';
import { PantryService } from '../pantry/pantry.service';

const PRICE_ESTIMATES: Record<string, number> = {
  Vegetables: 2,
  Fruits: 3,
  Dairy: 4,
  Grains: 5,
  Spices: 1.5,
  'Meat & Seafood': 12,
  Other: 3,
};

@Injectable()
export class GroceryService {
  constructor(
    @InjectModel(GroceryList.name) private readonly groceryModel: Model<GroceryListDocument>,
    private readonly pantryService: PantryService,
  ) {}

  async findActive(userId: string) {
    let list = await this.groceryModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();
    if (!list) {
      list = await this.groceryModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        generatedFrom: 'manual',
        status: 'active',
      });
    }
    return list;
  }

  async findAll(userId: string) {
    return this.groceryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async addItem(userId: string, dto: AddGroceryItemDto) {
    const list = await this.findActive(userId);
    const newItem: GroceryItem = {
      _id: new Types.ObjectId(),
      name: dto.name,
      quantity: dto.quantity,
      unit: dto.unit,
      category: dto.category || 'Other',
      estimatedPrice: dto.estimatedPrice ?? this.estimatePrice(dto.name, dto.category || 'Other', dto.quantity),
      purchased: false,
    };
    list.items.push(newItem);
    await list.save();
    return list;
  }

  async updateItem(userId: string, itemId: string, dto: UpdateGroceryItemDto) {
    const list = await this.groceryModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();
    if (!list) throw new NotFoundException('Grocery list not found');
    const item = list.items.find((i) => String(i._id) === itemId);
    if (!item) throw new NotFoundException('Grocery item not found');

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.estimatedPrice !== undefined) item.estimatedPrice = dto.estimatedPrice;
    if (dto.purchased !== undefined) item.purchased = dto.purchased;

    await list.save();
    return list;
  }

  async removeItem(userId: string, itemId: string) {
    const list = await this.groceryModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();
    if (!list) throw new NotFoundException('Grocery list not found');
    list.items = list.items.filter((i) => String(i._id) !== itemId);
    await list.save();
    return list;
  }

  async generateFromRecipe(userId: string, recipe: any) {
    return this.generateFromIngredients(userId, recipe.ingredients, recipe._id, 'recipe');
  }

  async generateFromMealPlan(userId: string, mealPlan: any) {
    const allIngredients: Array<{ name: string; quantity: number; unit: string }> = [];
    for (const day of mealPlan.days || []) {
      for (const meal of day.meals || []) {
        // For meal plans we add expected ingredient stubs
        if (meal.ingredients) {
          allIngredients.push(...meal.ingredients);
        }
      }
    }
    if (allIngredients.length === 0) {
      // Fallback: use typical weekly staples if meal plan lacks ingredients
      allIngredients.push(
        { name: 'Rice', quantity: 2, unit: 'kg' },
        { name: 'Wheat Flour', quantity: 2, unit: 'kg' },
        { name: 'Onions', quantity: 1, unit: 'kg' },
        { name: 'Tomatoes', quantity: 1, unit: 'kg' },
        { name: 'Milk', quantity: 3, unit: 'L' },
      );
    }
    return this.generateFromIngredients(userId, allIngredients, mealPlan._id, 'meal_plan');
  }

  async generateFromIngredients(
    userId: string,
    ingredients: Array<{ name: string; quantity: number; unit: string }>,
    sourceId: Types.ObjectId | string,
    source: string,
  ) {
    const missingItems: GroceryItem[] = [];

    for (const ing of ingredients) {
      const pantry = await this.pantryService.hasIngredient(userId, ing.name);
      const needed = ing.quantity;
      if (!pantry.has || pantry.quantity < needed) {
        const deficit = needed - (pantry.quantity || 0);
        const category = await this.guessCategory(ing.name);
        missingItems.push({
          _id: new Types.ObjectId(),
          name: ing.name,
          quantity: deficit,
          unit: ing.unit,
          category,
          estimatedPrice: this.estimatePrice(ing.name, category, deficit),
          purchased: false,
        });
      }
    }

    let list = await this.groceryModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'active' })
      .exec();
    if (!list) {
      list = await this.groceryModel.create({
        userId: new Types.ObjectId(userId),
        items: [],
        generatedFrom: source,
        status: 'active',
      });
    }

    for (const item of missingItems) {
      const existing = list.items.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase() && !i.purchased,
      );
      if (existing) {
        existing.quantity += item.quantity;
        existing.estimatedPrice += item.estimatedPrice;
      } else {
        list.items.push(item);
      }
    }

    if (sourceId) {
      list.generatedFrom = source;
      if (source === 'recipe') list.recipeId = new Types.ObjectId(String(sourceId));
      if (source === 'meal_plan') list.mealPlanId = new Types.ObjectId(String(sourceId));
    }
    await list.save();
    return { list, addedItems: missingItems.length, demoMode: false };
  }

  async getProgress(userId: string) {
    const list = await this.findActive(userId);
    const total = list.items.length;
    const purchased = list.items.filter((i) => i.purchased).length;
    const totalPrice = list.items.reduce((s, i) => s + (i.estimatedPrice || 0), 0);
    return {
      total,
      purchased,
      pending: total - purchased,
      progress: total > 0 ? Math.round((purchased / total) * 100) : 0,
      estimatedTotal: parseFloat(totalPrice.toFixed(2)),
    };
  }

  async addItemsBulk(userId: string, items: Array<{ name: string; quantity: number; unit: string; category?: string }>) {
    const list = await this.findActive(userId);
    for (const item of items) {
      const category = item.category || 'Other';
      const newItem: GroceryItem = {
        _id: new Types.ObjectId(),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category,
        estimatedPrice: this.estimatePrice(item.name, category, item.quantity),
        purchased: false,
      };
      list.items.push(newItem);
    }
    await list.save();
    return list;
  }

  private estimatePrice(name: string, category: string, quantity: number): number {
    const base = PRICE_ESTIMATES[category] ?? 3;
    return parseFloat((base * Math.max(quantity, 1) * 0.5).toFixed(2));
  }

  private async guessCategory(name: string): Promise<string> {
    const lower = name.toLowerCase();
    const map: Record<string, string[]> = {
      Vegetables: ['tomato', 'onion', 'potato', 'spinach', 'carrot', 'pepper', 'cabbage', 'cauliflower', 'ginger', 'garlic'],
      Fruits: ['apple', 'banana', 'orange', 'mango', 'lemon', 'grapes'],
      Dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'paneer', 'egg'],
      Grains: ['rice', 'flour', 'wheat', 'bread', 'pasta', 'oats', 'quinoa'],
      Spices: ['turmeric', 'cumin', 'coriander', 'salt', 'pepper', 'chili', 'garam masala', 'paprika'],
      'Meat & Seafood': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'prawn', 'shrimp'],
    };
    for (const [cat, keys] of Object.entries(map)) {
      if (keys.some((k) => lower.includes(k))) return cat;
    }
    return 'Other';
  }
}
