import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import { asApiTask } from '../../shared/testing/api-task';
import type { Task, TaskCompletion } from '../../shared/types/task.types';
import { TaskService } from '../../task-crud/services/task.service';
import { BOARD_CONFLICT_MESSAGE, BoardView } from './board-view';
import { apiBoard, boardTask } from './testing/board-fixtures';
import type { BoardColumnKey, BoardFilter } from './types/task-board.types';

const BOARD_URL = `${environment.apiBaseUrl}/api/tasks/board`;
const REORDER_URL = `${BOARD_URL}/reorder`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;

const OUTLINE = boardTask(1, 'Outline');
const DRAFT = boardTask(2, 'Draft');
const REVIEW = boardTask(3, 'Review');
const DAILY = boardTask(4, 'Daily reading', { recurrence: 'daily', isRecurring: true });

describe('BoardView', () => {
  let fixture: ComponentFixture<BoardView>;
  let host: HTMLElement;
  let http: HttpTestingController;
  let toasts: ToastService;

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const column = (key: BoardColumnKey) =>
    host.querySelector<HTMLElement>(`app-board-column .column[data-column="${key}"]`)!;
  const titles = (key: BoardColumnKey) =>
    [...column(key).querySelectorAll('.open')].map((n) => n.textContent?.trim());
  const isBoardGet = (url: string) => url === BOARD_URL;

  function render(filter: BoardFilter = {}, filtersActive = false): void {
    fixture.componentRef.setInput('projectId', 10);
    fixture.componentRef.setInput('filter', filter);
    fixture.componentRef.setInput('filtersActive', filtersActive);
    fixture.detectChanges();
  }

  /** Answers the board and details requests of one load. */
  function flushLoad(columns: Partial<Record<BoardColumnKey, Task[]>>, details?: Task[]): void {
    const all = details ?? Object.values(columns).flat();
    http.expectOne((r) => isBoardGet(r.url)).flush(apiBoard(columns));
    http.expectOne((r) => r.url === TASKS_URL).flush(all.map(asApiTask));
    fixture.detectChanges();
  }

  /** Opens a card's Move menu and picks an item, e.g. "Move to Done". */
  function moveWithMenu(taskId: number, label: string): void {
    host.querySelector<HTMLButtonElement>(`#board-card-${taskId}-move`)!.click();
    fixture.detectChanges();
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (i) => i.textContent?.trim() === label,
    );
    item!.click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(BoardView);
    host = fixture.nativeElement;
  });

  afterEach(() => {
    // Streak badges on repeating cards load their own streak; these specs do not check them.
    http.match((r) => r.url.endsWith('/streak')).forEach((r) => r.flush({}));
    fixture.destroy();
    http.verify();
  });

  it('shows a placeholder, then the three columns with counts', () => {
    render();
    expect(el('.skeleton')?.getAttribute('aria-label')).toBe('Loading board');

    flushLoad({ todo: [OUTLINE, DRAFT], done: [REVIEW] });

    expect(el('.skeleton')).toBeNull();
    expect(titles('todo')).toEqual(['Outline', 'Draft']);
    expect(titles('inProgress')).toEqual([]);
    expect(titles('done')).toEqual(['Review']);
    expect(text('.column[data-column="todo"] .count')).toBe('2');
  });

  it('sends the filters with both requests', () => {
    render({ recurring: true }, true);
    http.expectOne(`${BOARD_URL}?projectId=10&recurring=true`).flush(apiBoard({ todo: [DAILY] }));
    http
      .expectOne(`${TASKS_URL}?projectId=10&status=all&pageSize=100&recurring=true&page=1`)
      .flush([asApiTask(DAILY)]);
    fixture.detectChanges();
    expect(text('.filter-note')).toContain('Filters are on');
  });

  it('reloads when given a new filter', () => {
    render();
    flushLoad({ todo: [OUTLINE] });

    fixture.componentRef.setInput('filter', { overdue: true });
    fixture.detectChanges();

    http.expectOne(`${BOARD_URL}?projectId=10&overdue=true`).flush(apiBoard({}));
    http.expectOne((r) => r.url === TASKS_URL).flush([]);
  });

  it('shows an error with a retry, and reports it', () => {
    const failures: unknown[] = [];
    fixture.componentInstance.loadFailed.subscribe((e) => failures.push(e));
    render();
    http.expectOne((r) => r.url === TASKS_URL).flush([]);
    http
      .expectOne((r) => isBoardGet(r.url))
      .flush({ error: 'Boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text('.load-error')).toContain("Couldn't load the board.");
    expect(failures.length).toBe(1);

    el<HTMLButtonElement>('.retry')!.click();
    flushLoad({ todo: [OUTLINE] });
    expect(el('.load-error')).toBeNull();
    expect(titles('todo')).toEqual(['Outline']);
  });

  it('offers to add a task to an empty project', () => {
    const asks: void[] = [];
    fixture.componentInstance.newTask.subscribe(() => asks.push(undefined));
    render();
    flushLoad({});

    expect(text('.empty-title')).toBe('No tasks here yet.');
    el<HTMLButtonElement>('.empty .action')!.click();
    expect(asks.length).toBe(1);
  });

  it('offers to clear filters that match nothing', () => {
    const clears: void[] = [];
    fixture.componentInstance.clearFilters.subscribe(() => clears.push(undefined));
    render({ overdue: true }, true);
    flushLoad({});

    expect(text('.empty-title')).toBe('No tasks match these filters.');
    el<HTMLButtonElement>('.empty .action')!.click();
    expect(clears.length).toBe(1);
  });

  it('moves a card at once and saves the target column', () => {
    render();
    flushLoad({ todo: [OUTLINE, DRAFT], inProgress: [REVIEW] });

    moveWithMenu(2, 'Move to In Progress');

    expect(titles('todo')).toEqual(['Outline']);
    expect(titles('inProgress')).toEqual(['Draft', 'Review']);
    expect(text('.visually-hidden')).toBe('“Draft” moved to In Progress, position 1 of 2.');
    const req = http.expectOne(REORDER_URL);
    expect(req.request.body).toEqual({ projectId: 10, boardStatus: 'in_progress', tasks: [2, 3] });
    req.flush(req.request.body);
    fixture.detectChanges();
    expect(toasts.toasts()).toEqual([]);
  });

  it('keeps focus on a card moved with its menu', async () => {
    render();
    flushLoad({ todo: [OUTLINE, DRAFT] });

    moveWithMenu(2, 'Move up');
    await fixture.whenStable();

    expect(document.activeElement?.id).toBe('board-card-2-move');
    http.expectOne(REORDER_URL).flush({});
  });

  it('waits for one move to save before allowing the next', () => {
    render();
    flushLoad({ todo: [OUTLINE, DRAFT] });

    moveWithMenu(1, 'Move to Done');

    // A second move while the first saves is not sent.
    moveWithMenu(2, 'Move to Done');
    expect(titles('todo')).toEqual(['Draft']);
    http.expectOne(REORDER_URL).flush({});
    fixture.detectChanges();
    http.match((r) => isBoardGet(r.url)).forEach((r) => r.flush(apiBoard({})));
    http.match((r) => r.url === TASKS_URL).forEach((r) => r.flush([]));
  });

  it('puts the card back with a toast when saving fails', () => {
    render();
    flushLoad({ todo: [OUTLINE, DRAFT] });

    moveWithMenu(1, 'Move to In Progress');
    http.expectOne(REORDER_URL).flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(titles('todo')).toEqual(['Outline', 'Draft']);
    expect(titles('inProgress')).toEqual([]);
    expect(toasts.toasts().map((t) => [t.kind, t.message])).toEqual([
      ['error', "Couldn't move “Outline”. It has been put back."],
    ]);
  });

  it('reloads the board when it changed elsewhere', () => {
    render();
    flushLoad({ todo: [OUTLINE, DRAFT] });

    moveWithMenu(1, 'Move down');
    http
      .expectOne(REORDER_URL)
      .flush({ code: 'task-reorder-conflict' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(toasts.toasts().map((t) => [t.kind, t.message])).toEqual([
      ['info', BOARD_CONFLICT_MESSAGE],
    ]);
    flushLoad({ todo: [DRAFT], inProgress: [OUTLINE] });
    expect(titles('inProgress')).toEqual(['Outline']);
  });

  it('saves the whole column when filters hide part of it', () => {
    const hidden = boardTask(8, 'Hidden');
    render({ recurring: false }, true);
    flushLoad({ todo: [OUTLINE], inProgress: [DRAFT, REVIEW] });

    moveWithMenu(1, 'Move to In Progress');

    // The unfiltered board: a hidden task sits between Draft and Review.
    http
      .expectOne(`${BOARD_URL}?projectId=10`)
      .flush(apiBoard({ todo: [OUTLINE], inProgress: [DRAFT, hidden, REVIEW] }));
    const req = http.expectOne(REORDER_URL);
    // Outline went to the top of what the user saw, so it goes before Draft.
    expect(req.request.body.tasks).toEqual([1, 2, 8, 3]);
    req.flush(req.request.body);
  });

  it('tells the app about completions and shows a repeating task’s next occurrence', () => {
    const completions: TaskCompletion[] = [];
    TestBed.inject(TaskService).completions.subscribe((c) => completions.push(c));
    render();
    flushLoad({ todo: [DAILY] });
    // The streak badge asks for the streak; it is not what this test is about.
    http.match((r) => r.url.endsWith('/streak')).forEach((r) => r.flush({}));

    moveWithMenu(4, 'Move to Done');
    http.expectOne(REORDER_URL).flush({});
    fixture.detectChanges();

    expect(completions).toEqual([{ taskId: 4, completedAt: expect.any(String) }]);
    const next = boardTask(5, 'Daily reading', { recurrence: 'daily', isRecurring: true });
    flushLoad({ todo: [next], done: [DAILY] });
    http.match((r) => r.url.endsWith('/streak')).forEach((r) => r.flush({}));
    expect(titles('todo')).toEqual(['Daily reading']);
    expect(titles('done')).toEqual(['Daily reading']);
  });

  it('reports reopening a done task without reloading', () => {
    const completions: TaskCompletion[] = [];
    TestBed.inject(TaskService).completions.subscribe((c) => completions.push(c));
    render();
    flushLoad({ done: [REVIEW] });

    moveWithMenu(3, 'Move to To Do');
    http.expectOne(REORDER_URL).flush({});

    expect(completions).toEqual([{ taskId: 3, completedAt: null }]);
  });

  it('collapses the Done column', () => {
    render();
    flushLoad({ done: [REVIEW] });

    el<HTMLButtonElement>('.toggle')!.click();
    fixture.detectChanges();

    expect(titles('done')).toEqual([]);
    expect(el('.toggle')!.getAttribute('aria-expanded')).toBe('false');
  });
});
