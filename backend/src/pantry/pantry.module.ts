import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PantryItem, PantryItemSchema } from './schemas/pantry-item.schema';
import { PantryService } from './pantry.service';
import { PantryController } from './pantry.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: PantryItem.name, schema: PantryItemSchema }])],
  providers: [PantryService],
  controllers: [PantryController],
  exports: [PantryService],
})
export class PantryModule {}
