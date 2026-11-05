import { toLabel } from './label.mapper';

describe('toLabel', () => {
  it('renames id to labelId and drops the timestamps', () => {
    expect(
      toLabel({
        id: 3,
        name: 'Study',
        color: '#2563EB',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      }),
    ).toEqual({ labelId: 3, name: 'Study', color: '#2563EB' });
  });

  it('keeps a missing color as null', () => {
    expect(toLabel({ id: 5, name: 'errands', color: null }).color).toBeNull();
  });

  it('treats a blank color as none', () => {
    expect(toLabel({ id: 5, name: 'errands', color: '   ' }).color).toBeNull();
  });
});
