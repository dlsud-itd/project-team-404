import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
import { AllTasks } from './all-tasks';

describe('AllTasks', () => {
  let fixture: ComponentFixture<AllTasks>;
  let store: DashboardStore;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const titles = () => [...page.querySelectorAll('.task .title')].map((t) => t.textContent?.trim());
  const heading = () => page.querySelector('h2')?.textContent?.trim();
  const dueInput = () => page.querySelector<HTMLInputElement>('input[type="date"]');

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = el<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    render();
  }

  function submit(): void {
    el<HTMLFormElement>('form.composer')!.dispatchEvent(new Event('submit'));
    render();
  }

  function compose(): void {
    fixture.componentRef.setInput('composing', true);
    render();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));

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

  it('lists every task, open ones first, with project, priority and due date', () => {
    expect(titles()).toHaveLength(9);
    expect(titles().at(-1)).toBe('Gym session');
    const first = el('.task')!;
    expect(first.querySelector('.project')?.textContent?.trim()).toBe('School');
    expect(first.querySelector('.priority')?.textContent?.trim()).toBe('high');
    expect(first.querySelector('.due')?.classList).toContain('overdue');
  });

  it('shows the form only while composing, with today as the default due date', () => {
    expect(el('form.composer')).toBeNull();
    compose();

    expect(el<HTMLInputElement>('input[aria-label="Due date"]')!.value).toBe('2026-10-30');
    expect(el<HTMLSelectElement>('select[aria-label="Priority"]')!.value).toBe('medium');
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['over 120 characters', 'x'.repeat(121)],
  ])('rejects a title that is %s', (_, title) => {
    compose();
    type('input[aria-label="Task title"]', title);
    submit();

    expect(store.tasks()).toHaveLength(9);
    expect(el('input[aria-label="Task title"]')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('adds a trimmed task and closes the form', () => {
    compose();
    type('input[aria-label="Task title"]', '  Write essay  ');
    submit();

    expect(store.tasks().at(-1)).toMatchObject({
      title: 'Write essay',
      projectId: null,
      priority: 'medium',
      due: '2026-10-30',
    });
    expect(el('form.composer')).toBeNull();
  });

  it('checks a task off and deletes a task', () => {
    el<HTMLInputElement>('.task input[type="checkbox"]')!.click();
    render();
    expect(store.tasks().find((t) => t.title === 'Submit lab report')?.done).toBe(true);

    el<HTMLButtonElement>('button[aria-label="Delete Submit lab report"]')!.click();
    render();
    expect(titles()).not.toContain('Submit lab report');
  });

  it('says so when no task matches the filter', () => {
    store.filter.set({ projectId: 999 });
    render();

    expect(el('.empty')?.textContent?.trim()).toBe('No tasks match. Add one with “+ New Task”.');
  });

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
