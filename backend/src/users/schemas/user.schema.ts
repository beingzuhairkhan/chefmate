import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: true, timestamps: true })
export class UserPreferences {
  @Prop({ type: String })
  dietaryPreference?: string;

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  favoriteCuisines: string[];

  @Prop({ type: String })
  cookingExperience?: string;

  @Prop({ type: Number })
  householdSize?: number;

  @Prop({ type: Number })
  weeklyBudget?: number;

  @Prop({ type: String })
  cookingTimePreference?: string;

  @Prop({ type: String })
  nutritionPreference?: string;
}

const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences: UserPreferences;

  @Prop({ type: [String], default: [] })
  dietaryRestrictions: string[];

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: String, default: 'en-IN' })
  preferredLanguage: string;

  @Prop({ type: String })
  notificationToken?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Recipe', default: [] })
  favoriteRecipes: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
