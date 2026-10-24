import { describe, expect, it } from 'vitest';
import { changePasswordValidator } from './change-password.validator';

const valid = {
  currentPassword: 'old-password',
  newPassword: 'new-password',
  confirmPassword: 'new-password',
};

function issuePaths(input: unknown): string[] {
  const result = changePasswordValidator.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('changePasswordValidator', () => {
  it('accepts a valid change', () => {
    expect(changePasswordValidator.safeParse(valid).success).toBe(true);
  });

  it('requires the current password', () => {
    expect(issuePaths({ ...valid, currentPassword: '' })).toContain(
      'currentPassword'
    );
  });

  it('requires a new password of at least eight characters', () => {
    expect(
      issuePaths({ ...valid, newPassword: 'short', confirmPassword: 'short' })
    ).toContain('newPassword');
  });

  it('rejects a confirmation that does not match', () => {
    expect(issuePaths({ ...valid, confirmPassword: 'different' })).toEqual([
      'confirmPassword',
    ]);
  });

  it('rejects a new password equal to the current one', () => {
    expect(
      issuePaths({
        currentPassword: 'same-password',
        newPassword: 'same-password',
        confirmPassword: 'same-password',
      })
    ).toEqual(['newPassword']);
  });
});
