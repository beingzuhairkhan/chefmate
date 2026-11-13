import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CookingSessionDocument = CookingSession & Document;

@Schema({ timestamps: true })
export class CookingSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Recipe', required: true })
  recipeId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  currentStep: number;

  @Prop({ type: Number })
  timer?: number; // seconds

  @Prop({ type: String, default: 'active' })
  status: string; // active | paused | completed | abandoned
}

export const CookingSessionSchema = SchemaFactory.createForClass(CookingSession);
