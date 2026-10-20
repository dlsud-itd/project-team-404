import { Router } from 'express';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../lib/supabase-admin.client';
import { findUserByEmail } from './shared/db/queries/find-user-by-email.query';
import { isEmailAvailable } from './shared/db/queries/is-email-available.query';
import { isUsernameAvailable } from './shared/db/queries/is-username-available.query';
import { getInboxProjectId } from './shared/db/queries/get-inbox-project-id.query';
import { findUserById } from './shared/db/queries/find-user-by-id.query';
import { findUserByIdentifier } from './login/db/queries/find-user-by-identifier.query';
import { updateLastLogin } from './login/db/queries/update-last-login.query';
import { LoginService } from './login/login.service';
import { createLoginRouter } from './login/login.routes';
import { createSessionRouter } from './session/session.routes';
import { SessionService } from './session/session.service';
import { createSession } from './session/db/queries/create-session.query';
import { findSessionByTokenHash } from './session/db/queries/find-session-by-token-hash.query';
import { revokeSession } from './session/db/queries/revoke-session.query';
import { findMeWithInbox } from './session/db/queries/find-me-with-inbox.query';
import { createRegisterRouter } from './register';
import { RegisterService } from './register/register.service';
import { createUserProfile } from './register/db/queries/create-user-profile.query';
import { createInboxProject } from './register/db/queries/create-inbox-project.query';
import { createForgotPasswordRouter } from './forgot-password/forgot-password.routes';
import { ForgotPasswordService } from './forgot-password/forgot-password.service';
import { ConsoleMailer } from './forgot-password/mailer/console-mailer';
import { BrevoApiMailer } from './forgot-password/mailer/brevo-api-mailer';
import { invalidateResetTokens } from './forgot-password/db/queries/invalidate-reset-tokens.query';
import { createResetToken } from './forgot-password/db/queries/create-reset-token.query';
import { createResetPasswordRouter } from './reset-password/reset-password.routes';
import { ValidateResetTokenService } from './reset-password/services/validate-reset-token.service';
import { ResetPasswordService } from './reset-password/services/reset-password.service';
import { findResetTokenByHash } from './reset-password/db/queries/find-reset-token-by-hash.query';
import { markResetTokenUsed } from './reset-password/db/queries/mark-reset-token-used.query';
import { revokeUserSessions } from './reset-password/db/queries/revoke-user-sessions.query';
import { createProfileRouter } from './profile/profile.routes';
import { ProfileService } from './profile/profile.service';
import { findProfileByUserId } from './profile/db/queries/find-profile.query';
import { updateProfileByUserId } from './profile/db/queries/update-profile.query';
import type { Mailer } from './forgot-password/mailer/mailer';

export type AuthRouterOptions = {
  mailer?: Mailer;
};

export function createAuthRouter(options: AuthRouterOptions = {}): Router {
  const router = Router();
  const sessions = new SessionService({
    createSession,
    findSessionByTokenHash,
    revokeSession,
    findUserById,
    findMeWithInbox,
  });
  const registration = new RegisterService({
    isUsernameAvailable,
    isEmailAvailable,
    createAuthUser: (input) => supabaseAdmin.createUser(input),
    deleteAuthUser: (id) => supabaseAdmin.deleteUser(id),
    createUserProfile,
    createInboxProject,
  });
  const login = new LoginService({
    findUserByIdentifier,
    verifyCredentials: (email, password) =>
      supabaseAdmin.verifyCredentials(email, password),
    updateLastLogin,
    issueSession: (userId) => sessions.issue(userId),
    getInboxProjectId,
  });
  const mailer =
    options.mailer ??
    (env.BREVO_API_KEY && env.BREVO_SENDER_EMAIL
      ? new BrevoApiMailer()
      : new ConsoleMailer());
  if (
    !options.mailer &&
    env.NODE_ENV === 'production' &&
    (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL)
  ) {
    throw new Error(
      'BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured in production'
    );
  }
  const forgotPassword = new ForgotPasswordService({
    findUserByEmail,
    invalidateResetTokens,
    createResetToken,
    mailer,
    webBaseUrl: env.WEB_APP_URL,
  });
  const resetTokenValidator = new ValidateResetTokenService({
    findResetTokenByHash,
  });
  const resetPassword = new ResetPasswordService(resetTokenValidator, {
    updatePassword: (userId, password) =>
      supabaseAdmin.updatePassword(userId, password),
    markResetTokenUsed,
    revokeUserSessions,
  });
  const profile = new ProfileService({
    findProfile: findProfileByUserId,
    updateProfile: updateProfileByUserId,
  });

  router.use(createRegisterRouter(registration));
  router.use(createLoginRouter(login));
  router.use(createSessionRouter(sessions));
  router.use(createProfileRouter(sessions, profile));
  router.use(createForgotPasswordRouter(forgotPassword));
  router.use(createResetPasswordRouter(resetTokenValidator, resetPassword));
  return router;
}
