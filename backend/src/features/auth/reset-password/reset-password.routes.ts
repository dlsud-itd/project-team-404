import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { ResetPasswordService } from './services/reset-password.service';
import type { ValidateResetTokenService } from './services/validate-reset-token.service';
import { createResetPasswordController } from './reset-password.controller';
import { resetPasswordValidator } from './validators/reset-password.validator';
import { validateTokenQueryValidator } from './validators/validate-token-query.validator';

export function createResetPasswordRouter(
  validator: ValidateResetTokenService,
  resetter: ResetPasswordService
): Router {
  const router = Router();
  const controller = createResetPasswordController(validator, resetter);
  router.get(
    '/validate-reset-token',
    validateRequest(
      validateTokenQueryValidator,
      'query',
      'A valid reset token is required'
    ),
    controller.validate
  );
  router.post(
    '/reset-password',
    validateRequest(resetPasswordValidator, 'body', 'Invalid reset details'),
    controller.reset
  );
  return router;
}
