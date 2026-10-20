import type { RequestHandler } from 'express';
import { AuthConflictError } from '../shared/errors/auth.error';
import type { ProfileService } from './profile.service';
import type { ProfileUpdateInput } from './types/profile.types';

export function createProfileController(service: ProfileService): {
  getProfile: RequestHandler;
  updateProfile: RequestHandler;
} {
  return {
    getProfile: async (req, res, next) => {
      try {
        const profile = await service.getProfile(req.auth!.userId);
        res.status(200).json(profile);
      } catch (error) {
        if (error instanceof AuthConflictError) {
          res.status(404).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
    updateProfile: async (req, res, next) => {
      try {
        const profile = await service.updateProfile(
          req.auth!.userId,
          req.body as ProfileUpdateInput
        );
        res.status(200).json(profile);
      } catch (error) {
        if (error instanceof AuthConflictError) {
          res.status(409).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
  };
}
