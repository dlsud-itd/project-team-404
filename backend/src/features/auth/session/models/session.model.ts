export type SessionRecord = {
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export function isSessionUsable(
  session: SessionRecord | null,
  now = new Date()
): session is SessionRecord {
  return Boolean(
    session && !session.revokedAt && session.expiresAt.getTime() > now.getTime()
  );
}
