import type { RequestHandler } from 'express';
import { AuthUnauthorizedError } from '../shared/errors/auth.error';
import type { SessionService } from './session.service';
import { parseBearerToken } from './utils/parse-bearer.util';

export function createSessionController(service: SessionService): {
  me: RequestHandler;
  logout: RequestHandler;
} {
  return {
    me: async (req, res, next) => {
      try {
        res.status(200).json(await service.getMe(req.auth!.userId));
      } catch (error) {
        if (error instanceof AuthUnauthorizedError) {
          res.status(401).json({ error: 'Token invalid or expired' });
          return;
        }
        next(error);
      }
    },
    logout: async (req, res, next) => {
      const token = parseBearerToken(req.header('Authorization'));
      if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await service.expire(token);
        res.status(200).json({ message: 'Logged out successfully' });
      } catch (error) {
        if (error instanceof AuthUnauthorizedError) {
          res.status(401).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
  };
}
