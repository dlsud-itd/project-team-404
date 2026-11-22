import type { RequestHandler } from 'express';
import type { SettingsService } from './settings.service';
import type { UpdateSettingsInput } from './types';

export function createSettingsController(service: SettingsService): {
  get: RequestHandler;
  update: RequestHandler;
} {
  return {
    get: async (req, res, next) => {
      try {
        const settings = await service.get(req.auth!.userId);
        res.status(200).json(settings);
      } catch (error) {
        next(error);
      }
    },
    update: async (req, res, next) => {
      try {
        const settings = await service.update(
          req.auth!.userId,
          req.body as UpdateSettingsInput
        );
        res.status(200).json(settings);
      } catch (error) {
        next(error);
      }
    },
  };
}
