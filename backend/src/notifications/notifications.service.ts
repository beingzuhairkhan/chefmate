import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly notifModel: Model<NotificationDocument>) {}

  async findAll(userId: string, query?: { unreadOnly?: boolean }) {
    const q: Record<string, any> = { userId: new Types.ObjectId(userId) };
    if (query?.unreadOnly) q.read = false;
    return this.notifModel.find(q).sort({ createdAt: -1 }).limit(50).exec();
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    relatedItemId?: string;
    relatedType?: string;
    scheduledAt?: Date;
  }) {
    return this.notifModel.create({
      userId: new Types.ObjectId(data.userId),
      title: data.title,
      message: data.message,
      type: data.type || 'system',
      relatedItemId: data.relatedItemId ? new Types.ObjectId(data.relatedItemId) : undefined,
      relatedType: data.relatedType,
      scheduledAt: data.scheduledAt,
    });
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.notifModel
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: { read: true } },
        { new: true },
      )
      .exec();
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  async markAllRead(userId: string) {
    await this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notifModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
    return { unread: count };
  }
}
