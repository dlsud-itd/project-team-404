import type { ErrorRequestHandler } from 'express';
import { SupabaseAuthConfigurationError } from '../features/auth/shared/errors/auth.error';

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  console.error('Unhandled API error:', error);
  if (error instanceof SupabaseAuthConfigurationError) {
    res.status(503).json({ error: 'Authentication service is not configured' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
};
