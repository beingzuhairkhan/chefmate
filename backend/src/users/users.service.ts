import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select('+passwordHash');
    return query.exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const update: Record<string, any> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.preferredLanguage !== undefined) update.preferredLanguage = dto.preferredLanguage;
    if (dto.notificationToken !== undefined) update.notificationToken = dto.notificationToken;
    if (dto.allergies !== undefined) update.allergies = dto.allergies;
    if (dto.dietaryRestrictions !== undefined) update.dietaryRestrictions = dto.dietaryRestrictions;
    if (dto.preferences) update['preferences'] = dto.preferences;

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async addFavoriteRecipe(userId: string, recipeId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $addToSet: { favoriteRecipes: new Types.ObjectId(recipeId) } })
      .exec();
  }

  async removeFavoriteRecipe(userId: string, recipeId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $pull: { favoriteRecipes: new Types.ObjectId(recipeId) } })
      .exec();
  }
}
