import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { LoginService } from './login.service';
import { createLoginController } from './login.controller';
import { loginValidator } from './validators/login.validator';

export function createLoginRouter(service: LoginService): Router {
  const router = Router();
  router.post(
    '/login',
    validateRequest(loginValidator, 'body', 'Invalid login details'),
    createLoginController(service)
  );
  return router;
}
