export type ResetTokenFailureReason = 'invalid' | 'expired' | 'used';

export class ResetTokenError extends Error {
  constructor(readonly reason: ResetTokenFailureReason) {
    super(`Reset token is ${reason}`);
    this.name = 'ResetTokenError';
  }
}
