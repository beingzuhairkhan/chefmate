import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PantryItemDocument = PantryItem & Document;

@Schema({ timestamps: true })
export class PantryItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true, default: 'pcs' })
  unit: string;

  @Prop({ type: String, default: 'Other' })
  category: string;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop({ type: Date, default: () => new Date() })
  addedDate: Date;

  @Prop({ type: String })
  image?: string;

  @Prop({ type: Number, min: 0, max: 1 })
  confidence?: number;
}

export const PantryItemSchema = SchemaFactory.createForClass(PantryItem);
PantryItemSchema.index({ userId: 1, name: 1 }, { unique: true });
PantryItemSchema.index({ userId: 1, expiryDate: 1 });
