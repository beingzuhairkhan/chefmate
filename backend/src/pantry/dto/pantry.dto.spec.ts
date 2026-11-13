import { ValidationPipe } from '@nestjs/common';
import { ConfirmScanDto } from './pantry.dto';

describe('ConfirmScanDto', () => {
  it('preserves and validates the ingredients array through the global whitelist pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const result = await pipe.transform(
      { ingredients: [{ name: 'Tomatoes', quantity: 2, unit: 'pcs' }] },
      { type: 'body', metatype: ConfirmScanDto },
    );

    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0]).toMatchObject({ name: 'Tomatoes', quantity: 2, unit: 'pcs' });
  });
});
