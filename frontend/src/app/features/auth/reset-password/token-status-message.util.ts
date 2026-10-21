import { HttpErrorResponse } from '@angular/common/http';
import type { ResetTokenErrorResponse } from '../auth.service';

/** Why a reset link cannot be used. */
export type ResetTokenStatus = 'invalid' | 'expired' | 'used' | 'missing';

export type TokenStatusMessage = {
  title: string;
  message: string;
};

const MESSAGES: Record<ResetTokenStatus, TokenStatusMessage> = {
  expired: {
    title: 'This link has expired',
    message: 'Reset links only work for a limited time. Request a new link to continue.',
  },
  used: {
    title: 'This link has already been used',
    message: 'Each reset link works once, and only the newest link is valid. Request a new link.',
  },
  invalid: {
    title: 'This link is not valid',
    message: 'The reset link is incorrect or incomplete. Request a new link to continue.',
  },
  missing: {
    title: 'Reset link missing',
    message: 'Open this page from the link in your reset email, or request a new link.',
  },
};

export function tokenStatusMessage(status: ResetTokenStatus): TokenStatusMessage {
  return MESSAGES[status];
}

/**
 * Reads why GET /api/auth/validate-reset-token rejected a token. Anything other than a 400
 * with a known reason (network errors, server errors) is treated as an invalid link.
 */
export function readTokenStatus(error: unknown): ResetTokenStatus {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return 'invalid';
  const reason = (error.error as Partial<ResetTokenErrorResponse> | null)?.reason;
  return reason === 'expired' || reason === 'used' ? reason : 'invalid';
}
