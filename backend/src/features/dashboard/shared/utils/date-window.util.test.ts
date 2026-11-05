import { describe, expect, it } from 'vitest';
import { getDateWindow } from './date-window.util';

describe('getDateWindow', () => {
  it("uses the user's local date and includes the next N calendar days", () => {
    const now = new Date('2026-11-05T16:30:00.000Z');

    expect(getDateWindow('Asia/Manila', 2, now)).toEqual({
      startDate: '2026-11-06',
      endDate: '2026-11-08',
    });
    expect(getDateWindow('Etc/GMT+12', 2, now)).toEqual({
      startDate: '2026-11-05',
      endDate: '2026-11-07',
    });
  });

  it('adds calendar dates across a daylight-saving boundary', () => {
    expect(
      getDateWindow('America/Los_Angeles', 2, new Date('2026-03-08T07:30:00Z'))
    ).toEqual({ startDate: '2026-03-07', endDate: '2026-03-09' });
  });
});
