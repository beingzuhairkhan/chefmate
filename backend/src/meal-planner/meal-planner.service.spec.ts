import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MealPlannerAgent } from '../ai/agents/meal-planner-agent';
import { AutomationService } from '../automation/automation.service';
import { GroceryService } from '../grocery/grocery.service';
import { PantryService } from '../pantry/pantry.service';
import { MealPlan } from './schemas/meal-plan.schema';
import { MealPlannerService } from './meal-planner.service';

describe('MealPlannerService.findOne', () => {
  const userId = '507f1f77bcf86cd799439011';
  const planId = '507f191e810c19729de860ea';
  let execute: jest.Mock;
  let findOne: jest.Mock;
  let moduleRef;
  let service: MealPlannerService;

  beforeEach(async () => {
    execute = jest.fn();
    findOne = jest.fn(() => ({ exec: execute }));
    moduleRef = await Test.createTestingModule({
      providers: [
        MealPlannerService,
        { provide: getModelToken(MealPlan.name), useValue: { findOne } },
        { provide: MealPlannerAgent, useValue: {} },
        { provide: PantryService, useValue: {} },
        { provide: GroceryService, useValue: {} },
        { provide: AutomationService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(MealPlannerService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('looks up the requested plan for the authenticated user', async () => {
    const plan = { _id: planId };
    execute.mockResolvedValue(plan);

    await expect(service.findOne(planId, userId)).resolves.toBe(plan);
    expect(findOne).toHaveBeenCalledWith({ _id: planId, userId: new Types.ObjectId(userId) });
  });

  it('returns not found when the requested plan does not belong to the user', async () => {
    execute.mockResolvedValue(null);

    await expect(service.findOne(planId, userId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
