import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroceryList, GroceryListSchema } from './schemas/grocery-list.schema';
import { GroceryService } from './grocery.service';
import { GroceryController } from './grocery.controller';
import { PantryModule } from '../pantry/pantry.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GroceryList.name, schema: GroceryListSchema }]),
    PantryModule,
  ],
  providers: [GroceryService],
  controllers: [GroceryController],
  exports: [GroceryService],
})
export class GroceryModule {}
