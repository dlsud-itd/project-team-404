import type { Mailer, MailMessage } from './mailer';

export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.info(`Password reset email for ${message.to}: ${message.text}`);
  }
}
