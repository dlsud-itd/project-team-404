import { Router } from 'express';
import { AuthConflictError, AuthUnauthorizedError } from './auth.errors';
import type { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import {
  emailParamSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resetTokenSchema,
  signupSchema,
  usernameParamSchema,
} from './auth.schemas';

function getBearerToken(req: {
  header: (name: string) => string | undefined;
}): string | undefined {
  const authorization = req.header('Authorization');
  if (!authorization) {
    return undefined;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}

export function createAuthRouter(repository: AuthRepository): Router {
  const router = Router();
  const service = new AuthService(repository);

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
      res.status(409).json({ error: 'Username is already in use' });
      return;
    }
    if (!(await repository.isEmailAvailable(input.email))) {
      res.status(409).json({ error: 'Email is already in use' });
      return;
    }

    try {
      const result = await repository.createUser(input);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof AuthConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid login details',
        details: parsed.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      });
      return;
    }

    try {
      const result = await repository.login(parsed.data);
      res.status(200).json({
        token: result.token,
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          timezone: result.user.timezone,
          inboxProjectId: result.user.inboxProjectId,
        },
      });
    } catch (error) {
      if (error instanceof AuthUnauthorizedError) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      throw error;
    }
  });

  router.get('/me', async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Token invalid or expired' });
      return;
    }

    try {
      const user = await repository.getCurrentUser(token);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof AuthUnauthorizedError) {
        res.status(401).json({ error: 'Token invalid or expired' });
        return;
      }
      throw error;
    }
  });

  router.post('/logout', async (req, res) => {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await repository.logout(token);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      if (error instanceof AuthUnauthorizedError) {
        res.status(401).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.post('/forgot-password', async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid email address',
        details: parsed.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      });
      return;
    }

    await service.requestPasswordReset(parsed.data.email);
    res.status(200).json({
      message:
        'If an account exists for that email, a reset link has been sent.',
    });
  });

  router.get('/validate-reset-token', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const parsed = resetTokenSchema.safeParse(token);
    if (!parsed.success) {
      res.status(400).json({
        error: 'A valid reset token is required',
      });
      return;
    }

    const valid = await service.validateResetToken(parsed.data);
    res.status(200).json({ valid });
  });

  router.post('/reset-password', async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid reset details',
        details: parsed.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      });
      return;
    }

    const { token, password } = parsed.data;
    if (!(await service.validateResetToken(token))) {
      res.status(400).json({
        error: 'This reset link is invalid or has expired.',
      });
      return;
    }

    try {
      await service.resetPassword(token, password);
      res.status(200).json({
        message: 'Password updated successfully.',
      });
    } catch (error) {
      if (
        error instanceof Error &&
        /invalid|expired|used/i.test(error.message)
      ) {
        res.status(400).json({
          error: 'This reset link is invalid or has expired.',
        });
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
