import { z } from 'zod';
import { profileUpdateValidator } from '../validators/profile-update.validator';

export type Profile = {
  id: string;
  username: string;
  timezone: string | null;
};

export type ProfileUpdateInput = z.infer<typeof profileUpdateValidator>;
