import type { RequestHandler } from 'express';
import { ResetTokenError } from './errors/reset-token.error';
import type { ResetPasswordService } from './services/reset-password.service';
import type { ValidateResetTokenService } from './services/validate-reset-token.service';
import type { ResetPasswordInput } from './validators/reset-password.validator';
import type { ValidateTokenQuery } from './validators/validate-token-query.validator';

function sendTokenError(error: ResetTokenError, res: Parameters<RequestHandler>[1]) {
  res.status(400).json({
    error: 'Reset token is invalid',
    reason: error.reason,
  });
}

export function createResetPasswordController(
  validator: ValidateResetTokenService,
  resetter: ResetPasswordService,
): { validate: RequestHandler; reset: RequestHandler } {
  return {
    validate: async (_req, res, next) => {
      try {
        await validator.validate(
          (res.locals.validated as ValidateTokenQuery).token,
        );
        res.status(200).json({ valid: true });
      } catch (error) {
        if (error instanceof ResetTokenError) {
          sendTokenError(error, res);
          return;
        }
        next(error);
      }
    },
    reset: async (_req, res, next) => {
      const input = res.locals.validated as ResetPasswordInput;
      try {
        await resetter.reset(input.token, input.password);
        res.status(200).json({ message: 'Password updated successfully.' });
      } catch (error) {
        if (error instanceof ResetTokenError) {
          sendTokenError(error, res);
          return;
        }
        next(error);
      }
    },
  };
}
