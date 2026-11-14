import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../shared/middleware/validate-request.middleware';
import { getOrCreateSettings } from './db/queries/get-or-create-settings.query';
import { updateSettings } from './db/queries/update-settings.query';
import { createSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { updateSettingsValidator } from './validators/update-settings.validator';

export function createSettingsRouter(
  sessionService: SessionService,
  dependencies = {
    getOrCreateSettings,
    updateSettings,
  }
): Router {
  const router = Router();
  const controller = createSettingsController(
    new SettingsService(dependencies)
  );
  const auth = requireAuth(sessionService);

  router.get('/', auth, controller.get);
  router.patch(
    '/',
    auth,
    validateRequest(updateSettingsValidator, 'body', 'Invalid settings update'),
    controller.update
  );

  return router;
}
