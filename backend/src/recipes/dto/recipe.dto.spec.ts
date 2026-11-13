import { ValidationPipe } from '@nestjs/common';
import { FavoriteDto } from './recipe.dto';

describe('FavoriteDto', () => {
  it('preserves the favorite flag through the global whitelist pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    const result = await pipe.transform(
      { isFavorite: true },
      { type: 'body', metatype: FavoriteDto },
    );

    expect(result.isFavorite).toBe(true);
  });
});
