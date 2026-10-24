import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrevoApiMailer } from './brevo-api-mailer';

describe('BrevoApiMailer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the message through the Brevo API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    const mailer = new BrevoApiMailer(
      'test-api-key',
      'verified@example.com',
      'HabitTracker'
    );

    await mailer.send({
      to: 'user@example.com',
      subject: 'Reset your password',
      text: 'Reset link',
      html: '<p>Reset link</p>',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'api-key': 'test-api-key',
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'HabitTracker', email: 'verified@example.com' },
          to: [{ email: 'user@example.com' }],
          subject: 'Reset your password',
          textContent: 'Reset link',
          htmlContent: '<p>Reset link</p>',
        }),
      }
    );
  });

  it('rejects when Brevo returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ message: 'Invalid API key' }),
      })
    );
    const mailer = new BrevoApiMailer(
      'test-api-key',
      'verified@example.com',
      'HabitTracker'
    );

    await expect(
      mailer.send({
        to: 'user@example.com',
        subject: 'Reset',
        text: '',
        html: '',
      })
    ).rejects.toThrow('Brevo API request failed (HTTP 401): Invalid API key');
  });
});
