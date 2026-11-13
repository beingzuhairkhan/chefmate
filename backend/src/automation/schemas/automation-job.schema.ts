import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AutomationJobDocument = AutomationJob & Document;

@Schema({ timestamps: true })
export class AutomationJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  jobType: string; // expiry_check | grocery_generate | meal_plan_generate | voice_action | fridge_scan

  @Prop({ type: String, default: 'pending' })
  status: string; // pending | running | completed | failed

  @Prop({ type: Object, default: {} })
  executionDetails: Record<string, any>;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: String })
  error?: string;
}

export const AutomationJobSchema = SchemaFactory.createForClass(AutomationJob);
AutomationJobSchema.index({ userId: 1, createdAt: -1 });
