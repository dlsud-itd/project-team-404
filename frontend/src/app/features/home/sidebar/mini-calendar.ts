import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { DashboardStore, toDateKey, type Task } from '../dashboard.store';

const WEEKDAYS = [
  { short: 'Mo', long: 'Monday' },
  { short: 'Tu', long: 'Tuesday' },
  { short: 'We', long: 'Wednesday' },
  { short: 'Th', long: 'Thursday' },
  { short: 'Fr', long: 'Friday' },
  { short: 'Sa', long: 'Saturday' },
  { short: 'Su', long: 'Sunday' },
];

/** The dot under a day: the most urgent state among its tasks. */
export type DayMark = 'overdue' | 'open' | 'done';

interface Cell {
  /** Local date, YYYY-MM-DD. */
  key: string;
  day: number;
  /** False for the faded days of the previous and next month. */
  inMonth: boolean;
  today: boolean;
  selected: boolean;
  mark: DayMark | null;
  /** Read out by screen readers, e.g. "Friday, October 30, 2 tasks". */
  label: string;
  /** Shown on hover, e.g. "2 tasks". */
  hint: string | null;
}

/** "2026-10-30" → a local Date (new Date('2026-10-30') would be read as UTC). */
function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, days: number): string {
  const date = fromKey(key);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** Same day in another month, kept inside that month (Jan 31 + 1 month → Feb 28). */
function addMonths(key: string, months: number): string {
  const date = fromKey(key);
  const length = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return toDateKey(
    new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), length)),
  );
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function taskCount(count: number): string {
  return count === 1 ? '1 task' : `${count} tasks`;
}

@Component({
  selector: 'app-mini-calendar',
  template: `
    <section class="card" aria-labelledby="calendar-heading">
      <header class="head">
        <h2 id="calendar-heading" aria-live="polite">{{ monthLabel() }}</h2>
        <div class="nav">
          @if (!showingToday()) {
            <button type="button" class="today-button" (click)="goToday()">Today</button>
          }
          <button type="button" aria-label="Previous month" (click)="shift(-1)">‹</button>
          <button type="button" aria-label="Next month" (click)="shift(1)">›</button>
        </div>
      </header>

      <div class="viewport">
        <!-- Keyed on the month, so a new month is a new grid and its slide-in plays. -->
        @for (key of [monthKey()]; track key) {
          <div
            class="grid"
            role="grid"
            aria-labelledby="calendar-heading"
            [attr.data-slide]="slideFrom()"
          >
            <div class="row" role="row">
              @for (day of weekdays; track day.short) {
                <span class="weekday" role="columnheader" [attr.aria-label]="day.long">{{
                  day.short
                }}</span>
              }
            </div>
            @for (week of weeks(); track $index) {
              <div class="row" role="row">
                @for (cell of week; track cell.key) {
                  <span class="cell" role="gridcell" [attr.aria-selected]="cell.selected">
                    <button
                      type="button"
                      class="day"
                      [class.outside]="!cell.inMonth"
                      [class.today]="cell.today"
                      [class.selected]="cell.selected"
                      [attr.data-date]="cell.key"
                      [attr.aria-label]="cell.label"
                      [attr.aria-current]="cell.today ? 'date' : null"
                      [attr.title]="cell.hint"
                      [tabIndex]="cell.key === tabKey() ? 0 : -1"
                      (click)="select(cell.key)"
                      (keydown)="onKey($event, cell.key)"
                    >
                      {{ cell.day }}
                      @if (cell.mark) {
                        <span class="mark" [attr.data-mark]="cell.mark" aria-hidden="true"></span>
                      }
                    </button>
                  </span>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (summary(); as summary) {
        <div class="summary">
          <p role="status">
            <strong>{{ summary.date }}</strong> · {{ summary.text }}
          </p>
          <div class="summary-actions">
            <button type="button" class="link add" (click)="addTask.emit(summary.key)">
              + Add task
            </button>
            <button type="button" class="link clear" (click)="clear()">Clear</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    h2 {
      margin: 0;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .nav {
      display: flex;
      flex-shrink: 0;
      align-items: center;
    }
    button {
      font: inherit;
      cursor: pointer;
      &:focus-visible {
        outline: 2px solid #7b23a8;
        outline-offset: 1px;
      }
    }
    .nav button {
      min-width: 1.5rem;
      height: 1.5rem;
      border: 0;
      border-radius: 0.25rem;
      background: none;
      font-size: 1rem;
      &:hover {
        background: #fdeee6;
      }
    }
    .nav .today-button {
      margin-right: 0.25rem;
      padding: 0 0.5rem;
      border: 1px solid #d6a4dc;
      border-radius: 999px;
      color: #7b23a8;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .viewport {
      overflow: hidden;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      row-gap: 0.125rem;
      text-align: center;
      &[data-slide='right'] {
        animation: slide-from-right 260ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      &[data-slide='left'] {
        animation: slide-from-left 260ms cubic-bezier(0.22, 1, 0.36, 1);
      }
    }
    .row {
      display: contents;
    }
    .weekday {
      display: grid;
      place-items: center;
      height: 1.375rem;
      color: var(--ink);
      font-size: 0.75rem;
      font-weight: 500;
    }
    .cell {
      display: grid;
      place-items: center;
    }
    .day {
      position: relative;
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: #4a4a4a;
      font-size: 0.75rem;
      transition:
        background 150ms,
        transform 150ms;
      &:hover {
        background: #fdeee6;
        transform: scale(1.08);
      }
    }
    .outside {
      color: #b9aaa3;
    }
    .today {
      background: #7b23a8;
      color: #fff;
      font-weight: 600;
      outline: 2px solid #d6a4dc;
      &:hover {
        background: #8f34bd;
      }
    }
    .selected {
      box-shadow: 0 0 0 2px var(--orange);
      font-weight: 700;
    }
    .selected:not(.today) {
      background: #fde1d3;
    }
    .mark {
      position: absolute;
      bottom: 0.125rem;
      left: 50%;
      width: 0.3125rem;
      height: 0.3125rem;
      border-radius: 50%;
      background: #7b23a8;
      transform: translateX(-50%);
      &[data-mark='overdue'] {
        background: var(--error);
      }
      &[data-mark='done'] {
        background: #b9aaa3;
      }
    }
    .today .mark {
      background: #fff;
    }
    .summary {
      margin-top: 0.625rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f3d4c6;
      font-size: 0.75rem;
      animation: fade-in 200ms ease;
      p {
        margin: 0 0 0.375rem;
      }
    }
    .summary-actions {
      display: flex;
      gap: 0.75rem;
    }
    .link {
      padding: 0;
      border: 0;
      background: none;
      color: #7b23a8;
      font-size: 0.75rem;
      font-weight: 600;
      &:hover {
        text-decoration: underline;
      }
    }
    .clear {
      color: var(--ink-muted);
    }
    @keyframes slide-from-right {
      from {
        opacity: 0;
        transform: translateX(1.5rem);
      }
    }
    @keyframes slide-from-left {
      from {
        opacity: 0;
        transform: translateX(-1.5rem);
      }
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .grid[data-slide],
      .summary {
        animation: none;
      }
      .day {
        transition: none;
        &:hover {
          transform: none;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniCalendar {
  private readonly store = inject(DashboardStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** "+ Add task" for the selected day; emits its date, YYYY-MM-DD. */
  readonly addTask = output<string>();

  protected readonly weekdays = WEEKDAYS;
  /** First day of the shown month. */
  private readonly month = signal(monthStart(new Date()));
  /** The day the keyboard was last on. */
  private readonly focusKey = signal<string | null>(null);
  /** Which side a new month slides in from; null until the month first changes. */
  protected readonly slideFrom = signal<'left' | 'right' | null>(null);

  private readonly selectedKey = computed(() => this.store.filter().due ?? null);
  protected readonly monthKey = computed(() => toDateKey(this.month()).slice(0, 7));
  protected readonly showingToday = computed(
    () => this.monthKey() === this.store.today().slice(0, 7),
  );

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  /** Six full weeks, Monday first, padded with days of the months around it. */
  protected readonly weeks = computed(() => {
    const first = this.month();
    const leading = (first.getDay() + 6) % 7;
    const today = this.store.today();
    const selected = this.selectedKey();
    const byDay = this.store.tasksByDay();

    const cells = Array.from({ length: 42 }, (_, i): Cell => {
      const date = new Date(first.getFullYear(), first.getMonth(), 1 - leading + i);
      const key = toDateKey(date);
      const tasks = byDay.get(key) ?? [];
      const longDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === first.getMonth(),
        today: key === today,
        selected: key === selected,
        mark: this.markOf(tasks),
        label: tasks.length ? `${longDate}, ${taskCount(tasks.length)}` : longDate,
        hint: tasks.length ? taskCount(tasks.length) : null,
      };
    });
    return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
  });

  /** The one day reachable with Tab: where the keyboard was, else the selected day, today or the 1st. */
  protected readonly tabKey = computed(() => {
    const month = this.monthKey();
    const inMonth = (key: string | null) => key?.startsWith(month) ?? false;
    return [this.focusKey(), this.selectedKey(), this.store.today()].find(inMonth) ?? `${month}-01`;
  });

  protected readonly summary = computed(() => {
    const key = this.selectedKey();
    if (!key) return null;
    const tasks = this.store.tasksByDay().get(key) ?? [];
    const open = tasks.filter((t) => !t.done).length;
    let text = 'Nothing due';
    if (tasks.length) text = open ? `${taskCount(open)} to do` : 'All done';
    if (tasks.length && open && open < tasks.length) text += `, ${tasks.length - open} done`;
    return {
      key,
      date: fromKey(key).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      text,
    };
  });

  /** Shows only that day's tasks on the board; picking the same day again shows all. */
  protected select(key: string): void {
    this.focusKey.set(key);
    if (this.selectedKey() === key) {
      this.clear();
      return;
    }
    this.store.filter.set({ due: key });
    this.showMonthOf(key);
  }

  protected clear(): void {
    this.store.filter.set({});
  }

  protected shift(months: number): void {
    const m = this.month();
    this.setMonth(new Date(m.getFullYear(), m.getMonth() + months, 1));
  }

  protected goToday(): void {
    const today = this.store.today();
    this.showMonthOf(today);
    this.focusKey.set(today);
  }

  /** Grid keys: arrows by day and week, Home/End for the week, Page Up/Down for the month. */
  protected onKey(event: KeyboardEvent, key: string): void {
    const weekday = (fromKey(key).getDay() + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(key, -1),
      ArrowRight: () => addDays(key, 1),
      ArrowUp: () => addDays(key, -7),
      ArrowDown: () => addDays(key, 7),
      Home: () => addDays(key, -weekday),
      End: () => addDays(key, 6 - weekday),
      PageUp: () => addMonths(key, -1),
      PageDown: () => addMonths(key, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();

    const next = move();
    this.showMonthOf(next);
    this.focusKey.set(next);
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus(),
      { injector: this.injector },
    );
  }

  private markOf(tasks: Task[]): DayMark | null {
    if (!tasks.length) return null;
    const open = tasks.filter((t) => !t.done);
    if (open.some((t) => this.store.statusOf(t) === 'overdue')) return 'overdue';
    return open.length ? 'open' : 'done';
  }

  private showMonthOf(key: string): void {
    this.setMonth(monthStart(fromKey(key)));
  }

  private setMonth(month: Date): void {
    const step = month.getTime() - this.month().getTime();
    if (step === 0) return;
    this.slideFrom.set(step > 0 ? 'right' : 'left');
    this.month.set(month);
  }
}
