import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroceryListDocument = GroceryList & Document;

@Schema()
export class GroceryItem {
  @Prop()
  _id?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true, default: 'pcs' })
  unit: string;

  @Prop({ type: String, default: 'Other' })
  category: string;

  @Prop({ type: Number, default: 0 })
  estimatedPrice: number;

  @Prop({ type: Boolean, default: false })
  purchased: boolean;
}

export const GroceryItemSchema = SchemaFactory.createForClass(GroceryItem);

@Schema({ timestamps: true })
export class GroceryList {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [GroceryItemSchema], default: [] })
  items: GroceryItem[];

  @Prop({ type: String, default: 'recipe' })
  generatedFrom: string; // recipe | meal_plan | manual | voice

  @Prop({ type: String, default: 'active' })
  status: string; // active | completed | archived

  @Prop({ type: Types.ObjectId, ref: 'Recipe' })
  recipeId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MealPlan' })
  mealPlanId?: Types.ObjectId;
}

export const GroceryListSchema = SchemaFactory.createForClass(GroceryList);
