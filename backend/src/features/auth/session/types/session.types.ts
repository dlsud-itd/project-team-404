import type { PublicUser } from '../../shared/models/user.model';

export type AuthSession = { userId: string; expiresAt: Date };
export type SessionUser = PublicUser;
