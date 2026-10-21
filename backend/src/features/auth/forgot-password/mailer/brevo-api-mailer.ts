import { env } from '../../../../config/env';
import type { Mailer, MailMessage } from './mailer';

export class BrevoApiMailer implements Mailer {
  constructor(
    private readonly apiKey = env.BREVO_API_KEY,
    private readonly senderEmail = env.BREVO_SENDER_EMAIL,
    private readonly senderName = env.BREVO_SENDER_NAME
  ) {}

  async send(message: MailMessage): Promise<void> {
    if (!this.apiKey || !this.senderEmail) {
      throw new Error(
        'BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured to send email'
      );
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    });

    if (!response.ok) {
      let details: unknown;
      try {
        details = await response.json();
      } catch {
        details = undefined;
      }
      const message =
        typeof details === 'object' &&
        details !== null &&
        'message' in details &&
        typeof details.message === 'string'
          ? `: ${details.message.replace(/\s+/g, ' ').slice(0, 300)}`
          : '';
      throw new Error(
        `Brevo API request failed (HTTP ${response.status})${message}`
      );
    }
  }
}
