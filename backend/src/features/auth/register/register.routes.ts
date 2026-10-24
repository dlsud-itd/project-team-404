import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { createRegisterController } from './register.controller';
import type { RegisterService } from './register.service';
import { checkEmailValidator } from './validators/check-email.validator';
import { checkUsernameValidator } from './validators/check-username.validator';
import { signupValidator } from './validators/signup.validator';

export function createRegisterRouter(service: RegisterService): Router {
  const router = Router();
  const controller = createRegisterController(service);
  router.post(
    '/signup',
    validateRequest(signupValidator, 'body', 'Invalid signup details'),
    controller.register
  );
  router.get(
    '/check-username/:username',
    validateRequest(
      checkUsernameValidator,
      'params',
      'Username must be between 1 and 50 characters'
    ),
    controller.checkUsername
  );
  router.get(
    '/check-email/:email',
    validateRequest(
      checkEmailValidator,
      'params',
      'Email must be valid and no longer than 255 characters'
    ),
    controller.checkEmail
  );
  return router;
}
