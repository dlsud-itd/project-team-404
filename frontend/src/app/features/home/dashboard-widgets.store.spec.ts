import { TestBed } from '@angular/core/testing';
import { DASHBOARD_COLLAPSED_KEY, DashboardWidgetsStore } from './dashboard-widgets.store';

describe('DashboardWidgetsStore', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(DashboardWidgetsStore);
  };

  beforeEach(() => localStorage.removeItem(DASHBOARD_COLLAPSED_KEY));
  afterEach(() => {
    localStorage.removeItem(DASHBOARD_COLLAPSED_KEY);
    vi.restoreAllMocks();
  });

  it('starts with every widget expanded', () => {
    const store = create();
    expect(store.isCollapsed('current')).toBe(false);
    expect(store.isCollapsed('all-tasks')).toBe(false);
  });

  it('toggles a widget and remembers it after a reload', () => {
    const store = create();
    store.toggle('overdue');
    expect(store.isCollapsed('overdue')).toBe(true);
    expect(store.isCollapsed('current')).toBe(false);
    expect(JSON.parse(localStorage.getItem(DASHBOARD_COLLAPSED_KEY)!)).toEqual(['overdue']);

    expect(create().isCollapsed('overdue')).toBe(true);

    store.toggle('overdue');
    expect(store.isCollapsed('overdue')).toBe(false);
    expect(create().isCollapsed('overdue')).toBe(false);
  });

  it('ignores saved data it does not understand', () => {
    localStorage.setItem(DASHBOARD_COLLAPSED_KEY, '{not json');
    expect(create().isCollapsed('current')).toBe(false);

    localStorage.setItem(DASHBOARD_COLLAPSED_KEY, JSON.stringify(['upcoming', 'sidebar', 7]));
    const store = create();
    expect(store.isCollapsed('upcoming')).toBe(true);
    expect(store.isCollapsed('current')).toBe(false);
  });

  it('still toggles when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = create();
    expect(store.isCollapsed('all-tasks')).toBe(false);
    store.toggle('all-tasks');
    expect(store.isCollapsed('all-tasks')).toBe(true);
  });
});
