import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, default: 'system' })
  type: string; // expiry | meal_plan | grocery | voice | system

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Types.ObjectId })
  relatedItemId?: Types.ObjectId;

  @Prop({ type: String })
  relatedType?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
