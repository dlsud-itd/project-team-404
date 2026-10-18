import type { RequestHandler } from 'express';
import { AuthUnauthorizedError } from '../../shared/errors/auth.error';
import type { SessionService } from '../session.service';
import { parseBearerToken } from '../utils/parse-bearer.util';

export function requireAuth(sessionService: SessionService): RequestHandler {
  return async (req, res, next) => {
    const token = parseBearerToken(req.header('Authorization'));
    if (!token) {
      res.status(401).json({ error: 'Token invalid or expired' });
      return;
    }
    try {
      req.auth = await sessionService.verify(token);
      next();
    } catch (error) {
      if (error instanceof AuthUnauthorizedError) {
        res.status(401).json({ error: 'Token invalid or expired' });
        return;
      }
      next(error);
    }
  };
}
