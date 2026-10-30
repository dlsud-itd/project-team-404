import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
import { AllTasks } from './all-tasks';

describe('AllTasks with a calendar day picked', () => {
  let fixture: ComponentFixture<AllTasks>;
  let store: DashboardStore;
  let page: HTMLElement;

  const heading = () => page.querySelector('h2')?.textContent?.trim();
  const dueInput = () => page.querySelector<HTMLInputElement>('input[type="date"]');

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0));

    await TestBed.configureTestingModule({
      imports: [AllTasks],
      providers: [DashboardStore],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(AllTasks);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => vi.useRealTimers());

  it('names the day in the heading', () => {
    expect(heading()).toBe('All Tasks');

    store.filter.set({ due: '2026-11-02' });
    render();

    expect(heading()).toBe('Due Nov 2');
  });

  it('starts a new task on the picked day', () => {
    store.filter.set({ due: '2026-11-02' });
    fixture.componentInstance.composing.set(true);
    render();

    expect(dueInput()?.value).toBe('2026-11-02');
  });

  it('starts a new task today when no day is picked', () => {
    fixture.componentInstance.composing.set(true);
    render();

    expect(dueInput()?.value).toBe('2026-10-30');
  });
});
