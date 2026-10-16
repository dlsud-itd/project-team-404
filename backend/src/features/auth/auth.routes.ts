import { Router } from 'express';
import { AuthConflictError } from './auth.errors';
import type { AuthRepository } from './auth.repository';
import {
  emailParamSchema,
  signupSchema,
  usernameParamSchema,
} from './auth.schemas';

export function createAuthRouter(repository: AuthRepository): Router {
  const router = Router();

  router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid signup details',
        details: parsed.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      });
      return;
    }

    const input = parsed.data;
    if (!(await repository.isUsernameAvailable(input.username))) {
      res.status(400).json({ error: 'Username is already in use' });
      return;
    }
    if (!(await repository.isEmailAvailable(input.email))) {
      res.status(400).json({ error: 'Email is already in use' });
      return;
    }

    try {
      const result = await repository.createUser(input);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AuthConflictError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/check-username/:username', async (req, res) => {
    const parsed = usernameParamSchema.safeParse(req.params.username);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Username must be between 1 and 50 characters' });
      return;
    }
    res.json({ available: await repository.isUsernameAvailable(parsed.data) });
  });

  router.get('/check-email/:email', async (req, res) => {
    const parsed = emailParamSchema.safeParse(req.params.email);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Email must be valid and no longer than 255 characters',
      });
      return;
    }
    res.json({ available: await repository.isEmailAvailable(parsed.data) });
  });

  return router;
}
