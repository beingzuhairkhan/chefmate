import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import {
  AutomationJob,
  AutomationJobDocument,
} from "./schemas/automation-job.schema";
import {
  PantryItem,
  PantryItemDocument,
} from "../pantry/schemas/pantry-item.schema";
import { NotificationsService } from "../notifications/notifications.service";
import { PantryAgent } from "../ai/agents/pantry-agent";
import { RecipeAgent } from "../ai/agents/recipe-agent";
import { NotificationType } from "../common/constants";

@Injectable()
export class AutomationService implements OnModuleInit {
  private readonly logger = new Logger(AutomationService.name);
  private redisAvailable = false;

  constructor(
    @InjectModel(AutomationJob.name)
    private readonly jobModel: Model<AutomationJobDocument>,
    @InjectModel(PantryItem.name)
    private readonly pantryModel: Model<PantryItemDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly pantryAgent: PantryAgent,
    private readonly recipeAgent: RecipeAgent,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>("app.redisHost");
    const port = this.config.get<number>("app.redisPort");
    const password = this.config.get<string>("app.redisPassword");
    const username = this.config.get<string>("app.redisUsername", "default");
    try {
      const { default: IORedis } = await import("ioredis");
      const redis = new IORedis({
        host,
        port,
        username,
        password,
        tls: {}, 
        maxRetriesPerRequest: null,
        enableReadyCheck: false, 
        lazyConnect: true,
        connectTimeout: 10000,
        keepAlive: 10000,
        retryStrategy: (times) => {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
      });
       redis.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
      await redis.connect();
      await redis.ping();
      this.redisAvailable = true;
      await redis.quit();
      this.logger.log("Redis connected — BullMQ scheduled jobs enabled");
      this.scheduleExpiryChecks();
    } catch {
      this.redisAvailable = false;
      this.logger.warn(
        "Redis unavailable — expiry checks will run via periodic interval fallback",
      );
      this.startIntervalFallback();
    }
  }

  async logJob(
    userId: string,
    jobType: string,
    status: string,
    executionDetails: Record<string, any>,
  ) {
    return this.jobModel.create({
      userId: new Types.ObjectId(userId),
      jobType,
      status,
      executionDetails,
      startedAt: new Date(),
      completedAt:
        status === "completed" || status === "failed" ? new Date() : undefined,
    });
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.jobModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async runExpiryCheck(): Promise<{ checked: number; notified: number }> {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringItems = await this.pantryModel
      .find({ expiryDate: { $gte: now, $lte: threeDays } })
      .populate("userId", "name email notificationToken")
      .exec();

    let notified = 0;
    for (const item of expiringItems) {
      const userId = String((item.userId as any)?._id || item.userId);
      if (!userId) continue;

      const idempotencyKey = `expiry:${item._id}:${item.expiryDate?.toDateString()}`;
      const existing = await this.notificationsService.findAll(userId);
      const alreadyNotified = existing.some(
        (n) =>
          n.relatedType === "pantry_expiry" &&
          String(n.relatedItemId) === String(item._id),
      );
      if (alreadyNotified) continue;

      const daysLeft = Math.ceil(
        (item.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      const suggestions = await this.pantryAgent.suggestRecipesFromPantry([
        item.name,
      ]);

      await this.notificationsService.create({
        userId,
        title: `${item.name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
        message: `Your ${item.name} (${item.quantity} ${item.unit}) is expiring soon. ${suggestions.length ? `Try making: ${suggestions.join(", ")}` : "Use it before it goes to waste!"}`,
        type: NotificationType.EXPIRY,
        relatedItemId: String(item._id),
        relatedType: "pantry_expiry",
      });

      await this.logJob(userId, "expiry_check", "completed", {
        ingredient: item.name,
        daysLeft,
        suggestions,
        idempotencyKey,
      });

      notified++;
    }

    this.logger.log(
      `Expiry check: ${expiringItems.length} checked, ${notified} notified`,
    );
    return { checked: expiringItems.length, notified };
  }

  private scheduleExpiryChecks() {
    if (!this.redisAvailable) return;
    this.startIntervalFallback();
  }

  private startIntervalFallback() {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    setInterval(() => {
      this.runExpiryCheck().catch((err) =>
        this.logger.error(`Expiry check failed: ${(err as Error).message}`),
      );
    }, SIX_HOURS);
    this.logger.log("Expiry check scheduled every 6 hours");
  }

  async sendExpoPushNotification(token: string, title: string, body: string) {
    if (!token) return { sent: false, reason: "no token" };
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: token, title, body, sound: "default" }),
      });
      return { sent: res.ok };
    } catch (err) {
      this.logger.error(`Expo push failed: ${(err as Error).message}`);
      return { sent: false, error: (err as Error).message };
    }
  }
}
