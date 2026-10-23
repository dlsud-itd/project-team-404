import { z } from 'zod';

export const setFavoriteValidator = z
  .object({
    isFavorite: z.boolean(),
  })
  .strict();
