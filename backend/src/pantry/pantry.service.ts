import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PantryItem, PantryItemDocument } from './schemas/pantry-item.schema';
import { CreatePantryItemDto, UpdatePantryItemDto } from './dto/pantry.dto';
import { PantryAgent } from '../ai/agents/pantry-agent';

@Injectable()
export class PantryService {
  constructor(
    @InjectModel(PantryItem.name) private readonly pantryModel: Model<PantryItemDocument>,
    private readonly pantryAgent: PantryAgent,
  ) {}

  async scan(imageBase64: string, mimeType = 'image/jpeg') {
    const ingredients = await this.pantryAgent.recognizeIngredients(imageBase64, mimeType);
    return { ingredients, demoMode: !this.pantryAgent.isConfigured() };
  }

  async findAll(userId: string, filter?: { expiringOnly?: boolean; category?: string }) {
    const query: Record<string, any> = { userId: new Types.ObjectId(userId) };
    if (filter?.category) query.category = filter.category;
    if (filter?.expiringOnly) {
      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      query.expiryDate = { $gte: now, $lte: threeDays };
    }
    return this.pantryModel.find(query).sort({ addedDate: -1 }).exec();
  }

  async findExpiringSoon(userId: string, days = 3) {
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return this.pantryModel
      .find({ userId: new Types.ObjectId(userId), expiryDate: { $gte: now, $lte: limit } })
      .sort({ expiryDate: 1 })
      .exec();
  }

  async findExpired(userId: string) {
    const now = new Date();
    return this.pantryModel
      .find({ userId: new Types.ObjectId(userId), expiryDate: { $lt: now } })
      .sort({ expiryDate: 1 })
      .exec();
  }

  async create(userId: string, dto: CreatePantryItemDto) {
    return this.pantryModel.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      quantity: dto.quantity,
      unit: dto.unit,
      category: dto.category || 'Other',
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    });
  }

  async createMany(userId: string, items: CreatePantryItemDto[]) {
    const docs = items.map((i) => ({
      userId: new Types.ObjectId(userId),
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category || 'Other',
      expiryDate: i.expiryDate ? new Date(i.expiryDate) : undefined,
    }));
    return this.pantryModel.insertMany(docs);
  }

  async update(id: string, userId: string, dto: UpdatePantryItemDto) {
    const item = await this.pantryModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      {
        $set: {
          ...(dto.name && { name: dto.name }),
          ...(dto.quantity !== undefined && { quantity: dto.quantity }),
          ...(dto.unit && { unit: dto.unit }),
          ...(dto.category && { category: dto.category }),
          ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined }),
        },
      },
      { new: true },
    );
    if (!item) throw new NotFoundException('Pantry item not found');
    return item;
  }

  async remove(id: string, userId: string) {
    const result = await this.pantryModel.deleteOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) throw new NotFoundException('Pantry item not found');
    return { id };
  }

  async getNames(userId: string): Promise<string[]> {
    const items = await this.pantryModel.find({ userId: new Types.ObjectId(userId) }).select('name').lean().exec();
    return items.map((i) => i.name);
  }

  async hasIngredient(userId: string, name: string): Promise<{ has: boolean; quantity: number; unit: string }> {
    const item = await this.pantryModel.findOne({ userId: new Types.ObjectId(userId), name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (!item) return { has: false, quantity: 0, unit: '' };
    return { has: true, quantity: item.quantity, unit: item.unit };
  }
}
