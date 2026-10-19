import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { ForgotPasswordService } from './forgot-password.service';
import { createForgotPasswordController } from './forgot-password.controller';
import { forgotPasswordValidator } from './validators/forgot-password.validator';

export function createForgotPasswordRouter(
  service: ForgotPasswordService
): Router {
  const router = Router();
  router.post(
    '/forgot-password',
    validateRequest(forgotPasswordValidator, 'body', 'Invalid email address'),
    createForgotPasswordController(service)
  );
  return router;
}
