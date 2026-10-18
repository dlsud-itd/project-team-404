import { z } from 'zod';

export const usernameValidator = z.string().trim().min(1).max(50);
