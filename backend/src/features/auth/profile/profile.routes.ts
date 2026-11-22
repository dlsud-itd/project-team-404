import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { SessionService } from '../session/session.service';
import { requireAuth } from '../session/middleware/require-auth.middleware';
import type { ChangePasswordService } from './change-password.service';
import { createProfileController } from './profile.controller';
import type { ProfileService } from './profile.service';
import { changePasswordValidator } from './validators/change-password.validator';
import { profileUpdateValidator } from './validators/profile-update.validator';

export function createProfileRouter(
  sessionService: SessionService,
  service: ProfileService,
  passwords: ChangePasswordService
): Router {
  const router = Router();
  const controller = createProfileController(service, passwords);

  router.get('/profile', requireAuth(sessionService), controller.getProfile);
  router.put(
    '/me',
    requireAuth(sessionService),
    validateRequest(profileUpdateValidator, 'body', 'Invalid profile details'),
    controller.updateMe
  );
  router.patch(
    '/profile',
    requireAuth(sessionService),
    validateRequest(profileUpdateValidator, 'body', 'Invalid profile details'),
    controller.updateProfile
  );
  router.post(
    '/profile/password',
    requireAuth(sessionService),
    validateRequest(
      changePasswordValidator,
      'body',
      'Invalid password details'
    ),
    controller.changePassword
  );

  return router;
}
