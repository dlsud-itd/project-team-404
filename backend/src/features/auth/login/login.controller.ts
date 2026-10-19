import type { RequestHandler } from 'express';
import { InvalidCredentialsError } from './errors/invalid-credentials.error';
import type { LoginService } from './login.service';
import type { LoginInput } from './validators/login.validator';

export function createLoginController(service: LoginService): RequestHandler {
  return async (_req, res, next) => {
    try {
      const result = await service.login(res.locals.validated as LoginInput);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      next(error);
    }
  };
}
