import type { RequestHandler } from 'express';
import type { ForgotPasswordInput } from './validators/forgot-password.validator';
import type { ForgotPasswordService } from './forgot-password.service';

export function createForgotPasswordController(
  service: ForgotPasswordService
): RequestHandler {
  return async (_req, res, next) => {
    try {
      await service.request(
        (res.locals.validated as ForgotPasswordInput).email
      );
      res.status(200).json({
        message:
          'If an account exists for that email, a reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };
}
