import { ValidationPipe } from '@nestjs/common';
import { UpdateCookingDto } from './voice.dto';

describe('UpdateCookingDto', () => {
  it('preserves the cooking step and timer values through the global whitelist pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const result = await pipe.transform(
      { currentStep: 2, timer: 90, status: 'active' },
      { type: 'body', metatype: UpdateCookingDto },
    );

    expect(result).toMatchObject({ currentStep: 2, timer: 90, status: 'active' });
  });
});
