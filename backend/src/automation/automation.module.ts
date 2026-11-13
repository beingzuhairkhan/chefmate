import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutomationJob, AutomationJobSchema } from './schemas/automation-job.schema';
import { PantryItem, PantryItemSchema } from '../pantry/schemas/pantry-item.schema';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutomationJob.name, schema: AutomationJobSchema },
      { name: PantryItem.name, schema: PantryItemSchema },
    ]),
    NotificationsModule,
  ],
  providers: [AutomationService],
  controllers: [AutomationController],
  exports: [AutomationService],
})
export class AutomationModule {}
