import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { SessionService } from '../session/session.service';
import { requireAuth } from '../session/middleware/require-auth.middleware';
import { createProfileController } from './profile.controller';
import type { ProfileService } from './profile.service';
import { profileUpdateValidator } from './validators/profile-update.validator';

export function createProfileRouter(
  sessionService: SessionService,
  service: ProfileService
): Router {
  const router = Router();
  const controller = createProfileController(service);

  router.get('/profile', requireAuth(sessionService), controller.getProfile);
  router.patch(
    '/profile',
    requireAuth(sessionService),
    validateRequest(
      profileUpdateValidator,
      'body',
      'Invalid profile details'
    ),
    controller.updateProfile
  );

  return router;
}
