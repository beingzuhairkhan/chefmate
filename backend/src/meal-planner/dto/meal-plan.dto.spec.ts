import { ValidationPipe } from '@nestjs/common';
import { UpdateMealPlanDto } from './meal-plan.dto';

describe('UpdateMealPlanDto', () => {
  it('accepts the array of day plans stored by the backend schema', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });
    const days = [{ day: 'Monday', meals: [{ type: 'breakfast', recipeTitle: 'Vegetable Poha' }] }];

    const result = await pipe.transform(
      { days, budget: 50 },
      { type: 'body', metatype: UpdateMealPlanDto },
    );

    expect(result.days).toEqual(days);
  });
});
