export type PasswordResetTokenRecord = {
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};
