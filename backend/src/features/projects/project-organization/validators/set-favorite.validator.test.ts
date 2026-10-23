import { describe, expect, it } from 'vitest';
import { setFavoriteValidator } from './set-favorite.validator';

describe('setFavoriteValidator', () => {
  it('requires a boolean favorite flag', () => {
    expect(setFavoriteValidator.parse({ isFavorite: true })).toEqual({
      isFavorite: true,
    });
    expect(setFavoriteValidator.parse({ isFavorite: false })).toEqual({
      isFavorite: false,
    });
    expect(setFavoriteValidator.safeParse({}).success).toBe(false);
    expect(setFavoriteValidator.safeParse({ isFavorite: 'true' }).success).toBe(
      false
    );
  });
});
