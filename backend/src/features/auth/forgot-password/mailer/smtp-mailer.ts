import nodemailer from 'nodemailer';
import type { Mailer, MailMessage } from './mailer';

export class SmtpMailer implements Mailer {
  private readonly transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });

  async send(message: MailMessage): Promise<void> {
    const from = process.env.SMTP_FROM;
    if (!from) {
      throw new Error('SMTP_FROM must be configured to send password reset email');
    }
    await this.transport.sendMail({ from, ...message });
  }
}
