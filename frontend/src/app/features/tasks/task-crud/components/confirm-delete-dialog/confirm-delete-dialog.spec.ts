import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Task } from '../../../shared/types/task.types';
import { ConfirmDeleteTaskDialog } from './confirm-delete-dialog';

const STUDY: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Study ILT Module 4',
  description: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};

describe('ConfirmDeleteTaskDialog', () => {
  let fixture: ComponentFixture<ConfirmDeleteTaskDialog>;
  let page: HTMLElement;
  let confirmed: number;
  let cancelled: number;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;

  function set(inputs: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteTaskDialog],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDeleteTaskDialog);
    page = fixture.nativeElement;
    confirmed = 0;
    cancelled = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    set({ task: STUDY });
  });

  it('names the task and says what is removed with it', () => {
    expect(el('[role="alertdialog"]').getAttribute('aria-modal')).toBe('true');
    expect(el('#delete-title').textContent).toContain('Delete “Study ILT Module 4”?');
    expect(el('#delete-description').textContent?.trim()).toBe(
      'The task will be removed along with its labels.',
    );
  });

  it('mentions the repeat settings of a repeating task', () => {
    set({ task: { ...STUDY, isRecurring: true } });

    expect(el('#delete-description').textContent).toContain('labels and repeat settings');
  });

  it('starts with focus on Cancel', async () => {
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('button.cancel'));
  });

  it('confirms when Delete task is clicked', () => {
    el<HTMLButtonElement>('button.confirm').click();

    expect(confirmed).toBe(1);
    expect(cancelled).toBe(0);
  });

  it('cancels from the Cancel button, the backdrop and Escape', () => {
    el<HTMLButtonElement>('button.cancel').click();
    el<HTMLElement>('.backdrop').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelled).toBe(3);
    expect(confirmed).toBe(0);
  });

  it('blocks both choices while the delete runs', () => {
    set({ busy: true });

    expect(el<HTMLButtonElement>('button.confirm').disabled).toBe(true);
    expect(el<HTMLButtonElement>('button.cancel').disabled).toBe(true);
    expect(el('button.confirm').textContent).toContain('Deleting…');

    el<HTMLElement>('.backdrop').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(0);
  });

  it('shows an error when one is given', () => {
    expect(el('.error')).toBeNull();

    set({ error: 'Something went wrong. Please try again.' });

    expect(el('[role="alert"]').textContent).toContain('Something went wrong');
  });
});
