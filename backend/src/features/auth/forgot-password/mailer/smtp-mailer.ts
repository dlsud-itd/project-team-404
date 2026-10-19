import nodemailer from 'nodemailer';
import { env } from '../../../../config/env';
import type { Mailer, MailMessage } from './mailer';

export class SmtpMailer implements Mailer {
  private readonly transport = nodemailer.createTransport({
    host: env.BREVO_SMTP_HOST,
    port: env.BREVO_SMTP_PORT,
    secure: env.BREVO_SMTP_SECURE,
    auth:
      env.BREVO_SMTP_USER && env.BREVO_SMTP_PASSWORD
        ? { user: env.BREVO_SMTP_USER, pass: env.BREVO_SMTP_PASSWORD }
        : undefined,
  });

  async send(message: MailMessage): Promise<void> {
    if (!env.BREVO_SMTP_FROM) {
      throw new Error('BREVO_SMTP_FROM must be configured to send reset email');
    }
    await this.transport.sendMail({ from: env.BREVO_SMTP_FROM, ...message });
  }
}
