import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PantryModule } from './pantry/pantry.module';
import { RecipesModule } from './recipes/recipes.module';
import { MealPlannerModule } from './meal-planner/meal-planner.module';
import { GroceryModule } from './grocery/grocery.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { VoiceModule } from './voice/voice.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AutomationModule } from './automation/automation.module';
import { HealthController } from './config/health.controller';
import { DemoController } from './demo/demo.controller';
import { DemoService } from './demo/demo.service';
import { DemoModule } from './demo/demo.module';
@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 60 },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('app.mongodbUri'),
      }),
    }),
    CommonModule,
    AiModule,
    UsersModule,
    AuthModule,
    PantryModule,
    RecipesModule,
    MealPlannerModule,
    GroceryModule,
    NutritionModule,
    VoiceModule,
    NotificationsModule,
    AutomationModule,
    DemoModule
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    
  ],
})
export class AppModule {}
