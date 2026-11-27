import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Task } from '../../shared/types/task.types';
import { ListView, type ListMove } from './list-view';

const base: Task = {
  taskId: 1,
  projectId: 10,
  priorityId: 3,
  title: 'Write chapter 1',
  description: null,
  scheduledDate: null,
  dueDate: null,
  deadline: null,
  recurrence: 'none',
  recurrenceDays: [],
  recurrenceEndDate: null,
  completedAt: null,
  sortOrder: 0,
  isRecurring: false,
  isArchived: false,
  labels: [],
};
const CHAPTER = base;
const OUTLINE: Task = { ...base, taskId: 2, title: 'Outline', sortOrder: 1 };
const PROPOSAL: Task = {
  ...base,
  taskId: 3,
  title: 'Proposal',
  completedAt: '2026-10-01T10:00:00Z',
};

describe('ListView', () => {
  let fixture: ComponentFixture<ListView>;
  let moves: ListMove[];

  const host = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    host().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  function render(inputs: Partial<Record<keyof ListView, unknown>> = {}): void {
    fixture.componentRef.setInput('open', [CHAPTER, OUTLINE]);
    fixture.componentRef.setInput('completed', [PROPOSAL]);
    fixture.componentRef.setInput('canReorder', true);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ListView);
    moves = [];
    fixture.componentInstance.moved.subscribe((move) => moves.push(move));
  });

  afterEach(() => fixture.destroy());

  it('groups open and completed tasks', () => {
    render();

    expect(host().querySelector('#open-heading')?.textContent?.trim()).toBe('To do · 2');
    expect(host().querySelector('#completed-heading')?.textContent?.trim()).toBe('Completed · 1');
    expect(host().querySelectorAll('.reorderable app-task-item')).toHaveLength(2);
  });

  it('emits a move from the Move buttons, disabled at either end', () => {
    render();

    expect(button('Move Write chapter 1 up').disabled).toBe(true);
    expect(button('Move Outline down').disabled).toBe(true);
    button('Move Write chapter 1 down').click();

    expect(moves).toEqual([{ from: 0, to: 1, button: 'down' }]);
  });

  it('emits a move on Alt+ArrowUp, ignoring the top of the list', () => {
    render();
    const items = [...host().querySelectorAll<HTMLElement>('.reorderable > li')];

    items[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        code: 'ArrowUp',
        altKey: true,
        bubbles: true,
      }),
    );
    items[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        code: 'ArrowUp',
        altKey: true,
        bubbles: true,
      }),
    );

    expect(moves).toEqual([{ from: 1, to: 0, button: 'up' }]);
  });

  it('shows why reordering is off and offers no handles or key moves', () => {
    render({ canReorder: false, reorderBlocked: 'Clear the filters to reorder tasks.' });

    expect(host().querySelector('#reorder-hint')?.textContent?.trim()).toBe(
      'Clear the filters to reorder tasks.',
    );
    expect(host().querySelector('.handle')).toBeNull();
    expect(button('Move Write chapter 1 down').disabled).toBe(true);
    expect(button('Move Write chapter 1 down').getAttribute('aria-describedby')).toBe(
      'reorder-hint',
    );
    host()
      .querySelectorAll<HTMLElement>('.reorderable > li')[1]
      .dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          code: 'ArrowUp',
          altKey: true,
          bubbles: true,
        }),
      );
    expect(moves).toEqual([]);
  });

  it('says when everything is done', () => {
    render({ open: [] });

    expect(host().querySelector('.status')?.textContent?.trim()).toBe('Everything here is done.');
  });
});
