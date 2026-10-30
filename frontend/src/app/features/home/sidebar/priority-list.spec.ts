import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
import { PriorityList } from './priority-list';

describe('PriorityList (sidebar)', () => {
  let fixture: ComponentFixture<PriorityList>;
  let store: DashboardStore;
  let page: HTMLElement;

  const rows = () => [...page.querySelectorAll<HTMLButtonElement>('button.row')];

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    await TestBed.configureTestingModule({
      imports: [PriorityList],
      providers: [DashboardStore],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(PriorityList);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('lists High, Medium and Low with their open-task counts', () => {
    expect(rows().map((r) => r.querySelector('.badge')?.textContent)).toEqual([
      'High',
      'Medium',
      'Low',
    ]);
    expect(rows().map((r) => r.querySelector('.count')?.textContent)).toEqual(['3', '3', '2']);
    expect(rows()[0].querySelector('.hint')?.textContent).toBe('Do these first');
  });

  it('toggles a priority filter, with aria-pressed following it', () => {
    const [high, medium] = rows();
    high.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({ priority: 'high' });
    expect(high.getAttribute('aria-pressed')).toBe('true');

    medium.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({ priority: 'medium' });
    expect(high.getAttribute('aria-pressed')).toBe('false');

    medium.click();
    fixture.detectChanges();
    expect(store.filter()).toEqual({});
    expect(medium.getAttribute('aria-pressed')).toBe('false');
  });
});
