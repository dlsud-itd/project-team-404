import type { RequestHandler } from 'express';
import { AuthConflictError } from './errors/register.errors';
import type { SignupInput } from './types/register.types';
import type { RegisterService } from './register.service';
import type { z } from 'zod';
import { checkEmailValidator } from './validators/check-email.validator';
import { checkUsernameValidator } from './validators/check-username.validator';

export function createRegisterController(service: RegisterService): {
  register: RequestHandler;
  checkUsername: RequestHandler;
  checkEmail: RequestHandler;
} {
  return {
    register: async (_req, res, next) => {
      try {
        const result = await service.register(res.locals.validated as SignupInput);
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof AuthConflictError) {
          res.status(409).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
    checkUsername: async (_req, res, next) => {
      try {
        const username = res.locals.validated as z.infer<
          typeof checkUsernameValidator
        >;
        res.json({ available: await service.checkUsername(username) });
      } catch (error) {
        next(error);
      }
    },
    checkEmail: async (_req, res, next) => {
      try {
        const email = res.locals.validated as z.infer<typeof checkEmailValidator>;
        res.json({ available: await service.checkEmail(email) });
      } catch (error) {
        next(error);
      }
    },
  };
}
