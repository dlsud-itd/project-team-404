import type { RequestHandler } from 'express';
import {
  AuthConflictError,
  InvalidCurrentPasswordError,
} from '../shared/errors/auth.error';
import { hashToken } from '../session/utils/hash-token.util';
import { parseBearerToken } from '../session/utils/parse-bearer.util';
import type { ChangePasswordService } from './change-password.service';
import type { ProfileService } from './profile.service';
import type { ProfileUpdateInput } from './types/profile.types';
import type { ChangePasswordInput } from './validators/change-password.validator';

export function createProfileController(
  service: ProfileService,
  passwords: ChangePasswordService
): {
  getProfile: RequestHandler;
  updateProfile: RequestHandler;
  changePassword: RequestHandler;
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
    changePassword: async (req, res, next) => {
      const input = res.locals.validated as ChangePasswordInput;
      // requireAuth already accepted this token, so it is present here.
      const token = parseBearerToken(req.header('Authorization'))!;
      try {
        await passwords.change(
          req.auth!.userId,
          hashToken(token),
          input.currentPassword,
          input.newPassword
        );
        res.status(200).json({ message: 'Password changed successfully' });
      } catch (error) {
        // 400, not 401: a 401 would make the client treat it as an expired session.
        if (error instanceof InvalidCurrentPasswordError) {
          res.status(400).json({
            error: error.message,
            details: [{ field: 'currentPassword', message: error.message }],
          });
          return;
        }
        next(error);
      }
    },
  };
}
