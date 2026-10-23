import type { Profile } from '../types/profile.types';
import { diffProfile } from './diff-profile.util';

const SAVED: Profile = { id: '1', username: 'james', timezone: 'Asia/Manila' };

describe('diffProfile', () => {
  it('returns nothing when no field changed', () => {
    expect(diffProfile(SAVED, { username: 'james', timezone: 'Asia/Manila' })).toEqual({});
  });

  it('ignores whitespace around an unchanged username', () => {
    expect(diffProfile(SAVED, { username: '  james ', timezone: 'Asia/Manila' })).toEqual({});
  });

  it('returns only a changed username, trimmed', () => {
    expect(diffProfile(SAVED, { username: ' saluta ', timezone: 'Asia/Manila' })).toEqual({
      username: 'saluta',
    });
  });

  it('returns only a changed timezone', () => {
    expect(diffProfile(SAVED, { username: 'james', timezone: 'Europe/London' })).toEqual({
      timezone: 'Europe/London',
    });
  });

  it('returns both fields when both changed', () => {
    expect(diffProfile(SAVED, { username: 'saluta', timezone: 'Europe/London' })).toEqual({
      username: 'saluta',
      timezone: 'Europe/London',
    });
  });

  it('never sends an empty timezone', () => {
    expect(diffProfile({ ...SAVED, timezone: null }, { username: 'james', timezone: '' })).toEqual(
      {},
    );
  });
});
