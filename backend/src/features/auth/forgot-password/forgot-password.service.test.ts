import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordService } from './forgot-password.service';

describe('ForgotPasswordService', () => {
  it('invalidates old tokens, stores a hash, and emails the reset link', async () => {
    const now = new Date('2026-10-19T00:00:00.000Z');
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: 'user-123',
      email: 'james@example.com',
    });
    const invalidateResetTokens = vi.fn().mockResolvedValue(undefined);
    const createResetToken = vi.fn().mockResolvedValue(undefined);
    const mailer = { send: vi.fn().mockResolvedValue(undefined) };
    const service = new ForgotPasswordService(
      {
        findUserByEmail,
        invalidateResetTokens,
        createResetToken,
        mailer,
        webBaseUrl: 'https://habitflow.example/',
      },
      () => now
    );

    await service.request('James@Example.com');

    expect(findUserByEmail).toHaveBeenCalledWith('james@example.com');
    expect(invalidateResetTokens).toHaveBeenCalledWith('user-123');
    expect(createResetToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      })
    );
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'james@example.com',
        subject: 'Reset your HabitTracker password',
        text: expect.stringContaining(
          'https://habitflow.example/reset-password?token='
        ),
      })
    );
  });

  it('does not send mail for an unknown account', async () => {
    const mailer = { send: vi.fn() };
    const service = new ForgotPasswordService({
      findUserByEmail: vi.fn().mockResolvedValue(null),
      invalidateResetTokens: vi.fn(),
      createResetToken: vi.fn(),
      mailer,
      webBaseUrl: 'https://habitflow.example',
    });

    await service.request('unknown@example.com');

    expect(mailer.send).not.toHaveBeenCalled();
  });
});
