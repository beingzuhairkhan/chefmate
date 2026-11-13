import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema()
class Ingredient {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit: string;
}

const IngredientSchema = SchemaFactory.createForClass(Ingredient);

@Schema()
class InstructionStep {
  @Prop({ required: true })
  step: number;

  @Prop({ required: true })
  text: string;
}

const InstructionStepSchema = SchemaFactory.createForClass(InstructionStep);

@Schema()
class Nutrition {
  @Prop({ type: Number, default: 0 })
  calories: number;

  @Prop({ type: Number, default: 0 })
  protein: number;

  @Prop({ type: Number, default: 0 })
  carbs: number;

  @Prop({ type: Number, default: 0 })
  fat: number;

  @Prop({ type: Number, default: 0 })
  fiber: number;
}

const NutritionSchema = SchemaFactory.createForClass(Nutrition);

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [IngredientSchema], default: [] })
  ingredients: Ingredient[];

  @Prop({ type: [String], default: [] })
  missingIngredients: string[];

  @Prop({ type: [InstructionStepSchema], default: [] })
  instructions: InstructionStep[];

  @Prop({ type: Number, default: 0 })
  prepTime: number;

  @Prop({ type: Number, default: 0 })
  cookingTime: number;

  @Prop({ type: Number, default: 1 })
  servings: number;

  @Prop({ type: String, default: 'Easy' })
  difficulty: string;

  @Prop({ type: NutritionSchema, default: {} })
  nutrition: Nutrition;

  @Prop({ type: String })
  image?: string;

  @Prop({ type: String })
  cuisine?: string;

  @Prop({ type: Boolean, default: false })
  isFavorite: boolean;

  @Prop({ type: Number, default: 0 })
  rating?: number;

  @Prop({ type: Boolean, default: false })
  isAIGenerated: boolean;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
