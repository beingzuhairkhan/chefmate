import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MealPlanDocument = MealPlan & Document;

@Schema()
class MealSlot {
  @Prop({ required: true })
  type: string; // breakfast | lunch | dinner | snacks

  @Prop({ type: String })
  recipeTitle?: string;

  @Prop({ type: Types.ObjectId, ref: 'Recipe' })
  recipeId?: Types.ObjectId;

  @Prop({ type: String })
  description?: string;
}

const MealSlotSchema = SchemaFactory.createForClass(MealSlot);

@Schema()
class DayPlan {
  @Prop({ required: true })
  day: string; // Monday .. Sunday

  @Prop({ type: [MealSlotSchema], default: [] })
  meals: MealSlot[];
}

const DayPlanSchema = SchemaFactory.createForClass(DayPlan);

@Schema({ timestamps: true })
export class MealPlan {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  weekStartDate: Date;

  @Prop({ type: [DayPlanSchema], default: [] })
  days: DayPlan[];

  @Prop({ type: Number })
  budget?: number;

  @Prop({ type: Object, default: {} })
  preferences: Record<string, any>;
}

export const MealPlanSchema = SchemaFactory.createForClass(MealPlan);
MealPlanSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });
