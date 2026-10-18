import type { AuthSession } from './session.types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthSession;
    }
  }
}

export {};
