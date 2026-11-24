import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  type TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component, input, output } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  type ArchiveHooks,
  ArchiveUndoService,
} from '../../../archive/services/archive-undo.service';
import { TasksStore } from '../../shared/state/tasks.store';
import { NewTaskDialog } from '../../task-crud/components/new-task-dialog/new-task-dialog';
import { apiTimeline, pointer, timelineBar } from './testing/timeline-fixtures';
import { TIMELINE_LAYOUT_KEY } from './utils/timeline-layout.util';
import type { ApiTimelineBar, TimelineFilter } from './types/task-timeline.types';
import { TIMELINE_PROJECT_GONE, TimelineView } from './timeline-view';

const URL = `${environment.apiBaseUrl}/api/tasks/timeline`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;

const DRAFT = timelineBar(1, 'Draft recap', '2026-11-24', '2026-11-26');
const REVIEW = timelineBar(2, 'Review', '2026-11-27', '2026-11-27', { isOverdue: true });
const ESSAY = timelineBar(3, 'Essay', '2026-11-20', '2026-12-02', {
  projectId: 20,
  projectName: 'School',
  projectColor: '#7a4fd0',
});

/** Stands in for the edit popup, whose form loads its own data. */
@Component({ selector: 'app-new-task-dialog', template: '' })
class EditDialogStub {
  readonly taskId = input<number | null>(null);
  readonly updated = output<unknown>();
  readonly closed = output<void>();
}

describe('TimelineView', () => {
  let fixture: ComponentFixture<TimelineView>;
  let host: HTMLElement;
  let http: HttpTestingController;
  let failures: unknown[];
  let clears: number;

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const all = (selector: string) =>
    [...host.querySelectorAll<HTMLElement>(selector)].map((n) =>
      n.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const titles = () => all('app-timeline-bar .title');
  /** Each day header's weekday and date, e.g. "Wed 25". */
  const days = (selector = '.day') =>
    [...host.querySelectorAll<HTMLElement>(selector)].map((day) =>
      [...day.querySelectorAll(':scope > span')].map((part) => part.textContent?.trim()).join(' '),
    );
  const button = (label: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    )!;

  function render(
    inputs: { projectId?: number | null; filter?: TimelineFilter; filtersActive?: boolean } = {},
  ): void {
    fixture.componentRef.setInput('projectId', inputs.projectId ?? null);
    fixture.componentRef.setInput('filter', inputs.filter ?? {});
    fixture.componentRef.setInput('filtersActive', inputs.filtersActive ?? false);
    fixture.detectChanges();
  }

  /** The one timeline request waiting for an answer; a replaced request is cancelled. */
  function pending(): TestRequest {
    const open = http.match((r) => r.url === URL).filter((r) => !r.cancelled);
    expect(open).toHaveLength(1);
    return open[0];
  }

  function params(request: TestRequest): Record<string, string> {
    const p = request.request.params;
    return Object.fromEntries(p.keys().map((key) => [key, p.get(key)!]));
  }

  /** Answers the waiting request with bars for its window. */
  function answer(bars: ApiTimelineBar[], undatedCount = 0): Record<string, string> {
    const request = pending();
    const sent = params(request);
    request.flush(apiTimeline(sent['from'], sent['to'], bars, undatedCount));
    fixture.detectChanges();
    return sent;
  }

  function fail(status: number): void {
    pending().flush({ error: 'Nope' }, { status, statusText: 'Error' });
    fixture.detectChanges();
  }

  function createView(): void {
    fixture = TestBed.createComponent(TimelineView);
    host = fixture.nativeElement;
    fixture.componentInstance.loadFailed.subscribe((error) => failures.push(error));
    fixture.componentInstance.clearFilters.subscribe(() => clears++);
  }

  beforeEach(() => {
    localStorage.removeItem(TIMELINE_LAYOUT_KEY);
    // Wednesday, Nov 25 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideComponent(TimelineView, {
      remove: { imports: [NewTaskDialog] },
      add: { imports: [EditDialogStub] },
    });
    http = TestBed.inject(HttpTestingController);
    failures = [];
    clears = 0;
    createView();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.removeItem(TIMELINE_LAYOUT_KEY);
    TestBed.inject(TasksStore).creating.set(null);
  });

  it('shows a placeholder, then this week as bars grouped by project', () => {
    render();
    expect(el('[role="status"]')?.getAttribute('aria-label')).toBe('Loading timeline');

    const sent = answer([DRAFT, REVIEW, ESSAY]);

    expect(sent).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(el('[role="status"]')).toBeNull();
    expect(text('.range')).toBe('Nov 23 – 29, 2026');
    expect(all('.group-name')).toEqual(['Launch', 'School']);
    expect(all('.count')).toEqual(['2 tasks', '1 task']);
    expect(titles()).toEqual(['Draft recap', 'Review', 'Essay']);
  });

  it('has no separate task-name column; titles are on the bars', () => {
    render();
    answer([DRAFT]);
    expect(el('.corner')).toBeNull();
    expect(el('.task-label')).toBeNull();
    expect(el('.label')).toBeNull();
  });

  it('lays out one column per day, shades weekends and marks today', () => {
    render();
    answer([DRAFT]);

    expect(days()).toEqual(['Mon 23', 'Tue 24', 'Wed 25', 'Thu 26', 'Fri 27', 'Sat 28', 'Sun 29']);
    expect(days('.day.weekend')).toEqual(['Sat 28', 'Sun 29']);
    expect(days('.day.today')).toEqual(['Wed 25']);
    expect(host.querySelectorAll('.backdrop .weekend')).toHaveLength(2);
    // Wednesday is the third of seven days; the line runs down its middle.
    const line = el('.today-line')!;
    expect(parseFloat(line.style.left)).toBeCloseTo((2.5 / 7) * 100);
  });

  it('moves to the next and previous week and back to today', () => {
    render();
    answer([DRAFT]);
    expect(button('Today').disabled).toBe(true);

    button('Next week').click();
    fixture.detectChanges();
    expect(answer([])).toEqual({ from: '2026-11-30', to: '2026-12-06' });
    expect(text('.range')).toBe('Nov 30 – Dec 6, 2026');
    expect(el('.today-line')).toBeNull();

    button('Previous week').click();
    button('Previous week').click();
    fixture.detectChanges();
    // Both clicks land before the next render, so one request covers them.
    expect(answer([])).toEqual({ from: '2026-11-16', to: '2026-11-22' });

    button('Today').click();
    fixture.detectChanges();
    expect(answer([DRAFT])).toEqual({ from: '2026-11-23', to: '2026-11-29' });
  });

  it('shows the whole month when zoomed out, keeping today in view', () => {
    render();
    answer([DRAFT]);

    button('Month').click();
    fixture.detectChanges();

    expect(answer([DRAFT, ESSAY])).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(text('.range')).toBe('November 2026');
    expect(host.querySelectorAll('.day')).toHaveLength(30);
    expect(days('.day.today')).toEqual(['W 25']);

    button('Next month').click();
    fixture.detectChanges();
    expect(answer([])).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('asks for completed tasks when Show completed is on', () => {
    render();
    answer([DRAFT]);

    host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();

    expect(
      answer([DRAFT, timelineBar(9, 'Done', '2026-11-24', '2026-11-24', { isDone: true })]),
    ).toEqual({ from: '2026-11-23', to: '2026-11-29', includeCompleted: 'true' });
    expect(text('.bar.done .title')).toBe('Done');
  });

  it("asks for one project's tasks and its filters, and reloads when they change", () => {
    render({ projectId: 10, filter: { status: 'active' } });
    expect(answer([DRAFT])).toEqual({
      from: '2026-11-23',
      to: '2026-11-29',
      projectId: '10',
      status: 'active',
    });

    render({ projectId: 10, filter: { recurring: true } });
    expect(answer([])['recurring']).toBe('true');

    // Another project's bars are cleared at once, rather than shown under the new one.
    fixture.componentRef.setInput('projectId', 20);
    fixture.detectChanges();
    expect(el('.scroller')).toBeNull();
    expect(answer([ESSAY])['projectId']).toBe('20');
  });

  it('keeps the bars on screen while a new window loads', () => {
    render();
    answer([DRAFT]);
    button('Next week').click();
    fixture.detectChanges();

    expect(el('.scroller')?.getAttribute('aria-busy')).toBe('true');
    expect(titles()).toEqual(['Draft recap']);
    answer([]);
  });

  it('says when nothing is scheduled, and offers to clear filters when they are on', () => {
    render();
    answer([]);
    expect(text('.empty-title')).toBe('Nothing scheduled this week.');
    expect(el('.scroller')).toBeNull();

    render({ filter: { overdue: true }, filtersActive: true });
    answer([]);
    expect(text('.empty-title')).toBe('No dated tasks match these filters.');
    button('Clear filters').click();
    expect(clears).toBe(1);
  });

  it('counts undated tasks and links to the List view', async () => {
    await TestBed.inject(Router).navigateByUrl('/?tab=tasks&taskView=timeline');
    fixture.componentRef.setInput('viewParam', 'taskView');
    render();
    answer([DRAFT], 3);

    expect(text('.undated')).toBe('3 undated tasks not shown. See them in the List view');
    expect(el('.undated a')?.getAttribute('href')).toBe('/?tab=tasks');
  });

  it('shows an error with Try again when the timeline fails to load', () => {
    render();
    fail(500);

    expect(text('[role="alert"]')).toContain("Couldn't load the timeline.");
    expect(failures).toHaveLength(1);

    button('Try again').click();
    fixture.detectChanges();
    answer([DRAFT]);
    expect(el('[role="alert"]')).toBeNull();
    expect(titles()).toEqual(['Draft recap']);
  });

  it('says when the project is no longer available', () => {
    render({ projectId: 99 });
    fail(404);
    expect(text('[role="alert"]')).toContain(TIMELINE_PROJECT_GONE);
    expect(button('Try again')).toBeTruthy();
  });

  describe('working on tasks', () => {
    const barFor = (title: string) =>
      [...host.querySelectorAll<HTMLElement>('app-timeline-bar')].find(
        (bar) => bar.querySelector('.title')?.textContent?.trim() === title,
      )!;
    const checkFor = (title: string) => barFor(title).querySelector<HTMLButtonElement>('.check')!;
    const dialog = () => fixture.debugElement.query(By.directive(EditDialogStub));
    const creating = () => TestBed.inject(TasksStore).creating();

    /** Clicks a row at `x` pixels from its left edge, the row being 700px wide. */
    function clickRow(row: HTMLElement, x: number, target: HTMLElement = row): void {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ left: 50, width: 700 } as DOMRect);
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50 + x }));
      fixture.detectChanges();
    }

    /** The PUT that saves a task's done state. */
    function saveRequest(taskId: number): TestRequest {
      return http.expectOne((r) => r.method === 'PUT' && r.url === `${TASKS_URL}/${taskId}`);
    }

    beforeEach(() => {
      render({ projectId: null });
      answer([DRAFT, REVIEW, ESSAY]);
    });

    it('opens the edit popup for a clicked task, and reloads after a save', () => {
      expect(dialog()).toBeNull();

      barFor('Review').querySelector<HTMLElement>('.title')!.click();
      fixture.detectChanges();

      const stub = dialog().componentInstance as EditDialogStub;
      expect(stub.taskId()).toBe(2);
      // A click on a bar opens the task; it does not also start a new one.
      expect(creating()).toBeNull();

      stub.updated.emit({});
      stub.closed.emit();
      fixture.detectChanges();
      expect(dialog()).toBeNull();
      // The reload keeps the bars on screen while it runs.
      expect(el('.scroller')?.getAttribute('aria-busy')).toBe('false');
      answer([DRAFT, REVIEW, ESSAY]);
    });

    it('marks a task done at once, saves it, and reloads', () => {
      checkFor('Draft recap').click();
      fixture.detectChanges();

      expect(checkFor('Draft recap').getAttribute('aria-checked')).toBe('true');
      expect(checkFor('Draft recap').disabled).toBe(true);
      expect(dialog()).toBeNull();

      saveRequest(1).flush({ id: 1, isDone: true, doneAt: '2026-11-25T04:00:00Z', position: 0 });
      fixture.detectChanges();
      expect(text('.visually-hidden[aria-live]')).toBe('“Draft recap” marked done.');
      // With Show completed off, the reload drops the finished task.
      answer([REVIEW, ESSAY]);
      expect(titles()).toEqual(['Review', 'Essay']);
    });

    it('marks a completed task not done', () => {
      host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      fixture.detectChanges();
      answer([timelineBar(9, 'Finished', '2026-11-24', '2026-11-24', { isDone: true })]);

      checkFor('Finished').click();
      fixture.detectChanges();
      expect(checkFor('Finished').getAttribute('aria-checked')).toBe('false');
      saveRequest(9).flush({ id: 9, isDone: false, doneAt: null, position: 0 });
      answer([timelineBar(9, 'Finished', '2026-11-24')]);
    });

    it('puts the tick back and explains when a repeat is not due yet', () => {
      const info = vi.spyOn(TestBed.inject(ToastService), 'info');
      checkFor('Review').click();
      fixture.detectChanges();

      saveRequest(2).flush(
        { error: 'Not due yet', code: 'task-not-due', availableOn: '2026-11-28' },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      expect(checkFor('Review').getAttribute('aria-checked')).toBe('false');
      expect(barFor('Review').querySelector('.bar')!.classList).toContain('overdue');
      expect(info).toHaveBeenCalledTimes(1);
      expect(text('.visually-hidden[aria-live]')).toBe('“Review” was not changed.');
    });

    it('puts the tick back when saving fails', () => {
      const error = vi.spyOn(TestBed.inject(ToastService), 'error');
      checkFor('Essay').click();
      fixture.detectChanges();

      saveRequest(3).flush({ error: 'Down' }, { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(checkFor('Essay').getAttribute('aria-checked')).toBe('false');
      expect(checkFor('Essay').disabled).toBe(false);
      expect(error).toHaveBeenCalledWith("Couldn't update “Essay”. Please try again.");
    });

    it('archives a task from its menu, and Undo puts it back', () => {
      let hooks: ArchiveHooks = {};
      const archive = vi
        .spyOn(TestBed.inject(ArchiveUndoService), 'archive')
        .mockImplementation((_target, given = {}) => {
          hooks = given;
          given.apply?.();
        });

      barFor('Essay')
        .querySelector('.bar')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
      expect(items.map((item) => item.textContent?.trim())).toEqual(['Edit', 'Archive']);
      items[1].click();
      fixture.detectChanges();

      expect(archive).toHaveBeenCalledWith(
        { kind: 'task', id: 3, name: 'Essay' },
        expect.any(Object),
      );
      expect(titles()).toEqual(['Draft recap', 'Review']);
      // School had only Essay, so its group goes too.
      expect(all('.group-name')).toEqual(['Launch']);

      hooks.rollback?.();
      fixture.detectChanges();
      expect(titles()).toEqual(['Draft recap', 'Review', 'Essay']);
    });

    it("opens the edit popup from the task's menu", () => {
      barFor('Draft recap')
        .querySelector('.bar')!
        .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
      document.querySelector<HTMLElement>('[role="menuitem"]')!.click();
      fixture.detectChanges();

      expect((dialog().componentInstance as EditDialogStub).taskId()).toBe(1);
    });

    it('starts a new task on the day clicked, in that row’s project', () => {
      const rows = [...host.querySelectorAll<HTMLElement>('li.row')];
      // 250px into a 700px week is the third day, Wednesday.
      clickRow(rows[0], 250);
      expect(creating()).toEqual({ projectId: 10, scheduledDate: '2026-11-25' });

      // The School group's own header row adds to School.
      TestBed.inject(TasksStore).creating.set(null);
      clickRow(host.querySelectorAll<HTMLElement>('.group-row')[1], 690);
      expect(creating()).toEqual({ projectId: 20, scheduledDate: '2026-11-29' });

      TestBed.inject(TasksStore).creating.set(null);
      clickRow(rows[1], 0);
      expect(creating()).toEqual({ projectId: 10, scheduledDate: '2026-11-23' });
    });

    it('does not start a new task when the click lands on a bar', () => {
      const row = host.querySelector<HTMLElement>('li.row')!;
      clickRow(row, 150, row.querySelector<HTMLElement>('.bar')!);
      expect(creating()).toBeNull();
      expect((dialog().componentInstance as EditDialogStub).taskId()).toBe(1);
    });

    it('adds Inbox tasks to the page’s project when the group has none', () => {
      fixture.componentRef.setInput('projectId', 10);
      fixture.detectChanges();
      answer([timelineBar(5, 'Loose', '2026-11-24', '2026-11-24', { projectId: null })]);

      clickRow(host.querySelector<HTMLElement>('li.row')!, 400);
      expect(creating()).toEqual({ projectId: 10, scheduledDate: '2026-11-27' });
    });
  });

  describe('resizing the day columns', () => {
    const chart = () => el('.chart')!;
    const cssVar = (name: string) => chart().style.getPropertyValue(name);
    const saved = () => JSON.parse(localStorage.getItem(TIMELINE_LAYOUT_KEY) ?? 'null');
    const dayHandles = () => [...host.querySelectorAll<HTMLElement>('.day app-resize-handle')];

    /** Gives an element a drawn width; the test DOM does not lay anything out. */
    function drawnWidth(selector: string, width: number): void {
      vi.spyOn(el(selector)!, 'getBoundingClientRect').mockReturnValue({ width } as DOMRect);
    }

    function drag(handle: HTMLElement, dx: number, end = true): void {
      handle.dispatchEvent(pointer('pointerdown', 300));
      handle.dispatchEvent(pointer('pointermove', 300 + dx));
      if (end) handle.dispatchEvent(pointer('pointerup', 300 + dx));
      fixture.detectChanges();
    }

    function press(handle: HTMLElement, key: string): void {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      fixture.detectChanges();
    }

    beforeEach(() => {
      render();
      answer([DRAFT, REVIEW]);
      // Seven 100px days, as a wide screen would draw them.
      drawnWidth('.days', 700);
    });

    it('sets every day to one width, keeping the dragged edge under the pointer', () => {
      expect(chart().hasAttribute('data-fixed')).toBe(false);

      // Wednesday's right edge is the third boundary: 60px shared by three days.
      drag(dayHandles()[2], 60, false);
      expect(chart().classList).toContain('resizing');
      expect(saved()).toBeNull();
      dayHandles()[2].dispatchEvent(pointer('pointerup', 360));
      fixture.detectChanges();

      expect(chart().classList).not.toContain('resizing');
      expect(chart().hasAttribute('data-fixed')).toBe(true);
      expect(cssVar('--track-w')).toBe('840px');
      expect(dayHandles()[0].getAttribute('aria-valuenow')).toBe('120');
      expect(saved()).toEqual({ dayWidth: { week: 120, month: null } });
      // Bars are placed in shares of the grid, so they follow without moving themselves.
      expect(el<HTMLElement>('app-timeline-bar')!.style.left).toBe(`${(1 / 7) * 100}%`);
    });

    it('keeps a width for each zoom, and fits the screen again on double-click', () => {
      drag(dayHandles()[0], 20);
      expect(cssVar('--track-w')).toBe('840px');

      button('Month').click();
      fixture.detectChanges();
      answer([DRAFT]);
      expect(chart().hasAttribute('data-fixed')).toBe(false);

      button('Week').click();
      fixture.detectChanges();
      answer([DRAFT]);
      expect(cssVar('--track-w')).toBe('840px');

      dayHandles()[4].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();
      expect(chart().hasAttribute('data-fixed')).toBe(false);
      expect(saved().dayWidth.week).toBeNull();
    });

    it('has one keyboard stop that resizes the days', () => {
      const stops = [...host.querySelectorAll<HTMLElement>('app-resize-handle[tabindex="0"]')];
      expect(stops.map((s) => s.getAttribute('aria-label'))).toEqual(['Resize day columns']);
      expect(stops[0].getAttribute('aria-valuetext')).toBe('Fit to screen');

      press(stops[0], 'End');
      expect(cssVar('--track-w')).toBe(`${320 * 7}px`);
      press(stops[0], 'ArrowLeft');
      expect(cssVar('--track-w')).toBe(`${304 * 7}px`);
      press(stops[0], 'Enter');
      expect(chart().hasAttribute('data-fixed')).toBe(false);
    });

    it('opens with the day width saved in this browser', () => {
      localStorage.setItem(
        TIMELINE_LAYOUT_KEY,
        JSON.stringify({ dayWidth: { week: 150, month: null } }),
      );
      fixture.destroy();
      createView();
      render();
      answer([DRAFT]);

      expect(cssVar('--track-w')).toBe('1050px');
      expect(dayHandles()[0].getAttribute('aria-valuenow')).toBe('150');
    });
  });
});
