import { describe, expect, it, vi } from 'vitest';
import { hashToken } from '../../session/utils/hash-token.util';
import { ResetTokenError } from '../errors/reset-token.error';
import { ValidateResetTokenService } from './validate-reset-token.service';

const now = new Date('2026-10-19T00:00:00.000Z');
const token = 'valid-reset-token';

describe('ValidateResetTokenService', () => {
  it('looks up the reset record using only the token hash', async () => {
    const dependencies = {
      findResetTokenByHash: vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(now.getTime() + 60_000),
        usedAt: null,
      }),
    };
    const service = new ValidateResetTokenService(dependencies, () => now);

    await expect(service.validate(token)).resolves.toMatchObject({
      userId: 'user-123',
      expiresAt: new Date(now.getTime() + 60_000),
      usedAt: null,
    });
    expect(dependencies.findResetTokenByHash).toHaveBeenCalledWith(
      hashToken(token)
    );
  });

  it('rejects an unknown token', async () => {
    const dependencies = {
      findResetTokenByHash: vi.fn().mockResolvedValue(null),
    };
    const service = new ValidateResetTokenService(dependencies, () => now);

    await expect(service.validate(token)).rejects.toMatchObject({
      reason: 'invalid',
    });
  });

  it('rejects an already-used token', async () => {
    const dependencies = {
      findResetTokenByHash: vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(now.getTime() + 60_000),
        usedAt: now,
      }),
    };
    const service = new ValidateResetTokenService(dependencies, () => now);

    await expect(service.validate(token)).rejects.toBeInstanceOf(
      ResetTokenError
    );
    await expect(service.validate(token)).rejects.toMatchObject({
      reason: 'used',
    });
  });

  it('rejects an expired token', async () => {
    const dependencies = {
      findResetTokenByHash: vi.fn().mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(now.getTime() - 60_000),
        usedAt: null,
      }),
    };
    const service = new ValidateResetTokenService(dependencies, () => now);

    await expect(service.validate(token)).rejects.toMatchObject({
      reason: 'expired',
    });
  });
});
