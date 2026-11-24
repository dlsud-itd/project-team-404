import {
  DAY_WIDTH_LIMITS,
  DEFAULT_TIMELINE_LAYOUT,
  TIMELINE_LAYOUT_KEY,
  clampWidth,
  dayWidthForDrag,
  readTimelineLayout,
  saveTimelineLayout,
} from './timeline-layout.util';

describe('timeline layout', () => {
  afterEach(() => {
    localStorage.removeItem(TIMELINE_LAYOUT_KEY);
    vi.restoreAllMocks();
  });

  it('keeps widths inside their limits, in whole pixels', () => {
    const week = DAY_WIDTH_LIMITS.week;
    expect(clampWidth(200.4, week)).toBe(200);
    expect(clampWidth(10, week)).toBe(48);
    expect(clampWidth(9000, week)).toBe(320);
  });

  it('keeps the dragged day edge under the pointer', () => {
    const week = DAY_WIDTH_LIMITS.week;
    // The first day's edge moves with the pointer one to one.
    expect(dayWidthForDrag(100, 30, 0, week)).toBe(130);
    // The fourth day's edge moves 30px when each of the four days grows by 7.5px.
    expect(dayWidthForDrag(100, 30, 3, week)).toBe(108);
    expect(dayWidthForDrag(100, -400, 0, week)).toBe(week.min);
    expect(dayWidthForDrag(30, 4000, 0, DAY_WIDTH_LIMITS.month)).toBe(120);
  });

  it('saves and reads back the widths', () => {
    const layout = { dayWidth: { week: 160, month: null } };
    saveTimelineLayout(layout);
    expect(readTimelineLayout()).toEqual(layout);
  });

  it('starts from the defaults when nothing usable is saved', () => {
    expect(readTimelineLayout()).toEqual(DEFAULT_TIMELINE_LAYOUT);

    localStorage.setItem(TIMELINE_LAYOUT_KEY, 'not json');
    expect(readTimelineLayout()).toEqual(DEFAULT_TIMELINE_LAYOUT);

    localStorage.setItem(TIMELINE_LAYOUT_KEY, JSON.stringify({ dayWidth: 5 }));
    expect(readTimelineLayout()).toEqual(DEFAULT_TIMELINE_LAYOUT);
  });

  it('ignores the task-name width that older saves held', () => {
    localStorage.setItem(
      TIMELINE_LAYOUT_KEY,
      JSON.stringify({ nameWidth: 240, dayWidth: { week: 160, month: null } }),
    );
    expect(readTimelineLayout()).toEqual({ dayWidth: { week: 160, month: null } });
  });

  it('brings saved widths back inside the limits', () => {
    localStorage.setItem(TIMELINE_LAYOUT_KEY, JSON.stringify({ dayWidth: { week: 1, month: 50 } }));
    expect(readTimelineLayout()).toEqual({
      dayWidth: { week: 48, month: 50 },
    });
  });

  it('works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveTimelineLayout(DEFAULT_TIMELINE_LAYOUT)).not.toThrow();
    expect(readTimelineLayout()).toEqual(DEFAULT_TIMELINE_LAYOUT);
  });
});
