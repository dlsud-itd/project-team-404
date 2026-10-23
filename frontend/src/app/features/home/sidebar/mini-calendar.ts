import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

@Component({
  selector: 'app-mini-calendar',
  template: `
    <section class="card" aria-labelledby="calendar-heading">
      <header class="head">
        <h2 id="calendar-heading" aria-live="polite">{{ monthLabel() }}</h2>
        <div class="nav">
          <button type="button" aria-label="Previous month" (click)="shift(-1)">‹</button>
          <button type="button" aria-label="Next month" (click)="shift(1)">›</button>
        </div>
      </header>

      <div class="grid" role="grid" [attr.aria-labelledby]="'calendar-heading'">
        @for (day of weekdays; track day) {
          <span class="weekday" role="columnheader">{{ day }}</span>
        }
        @for (cell of cells(); track $index) {
          <span
            class="day"
            role="gridcell"
            [class.today]="cell.today"
            [attr.aria-current]="cell.today ? 'date' : null"
            >{{ cell.day }}</span
          >
        }
      </div>
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
    }
    .nav button {
      width: 1.5rem;
      height: 1.5rem;
      border: 0;
      border-radius: 0.25rem;
      background: none;
      font: inherit;
      font-size: 1rem;
      cursor: pointer;
      &:hover {
        background: #fdeee6;
      }
      &:focus-visible {
        outline: 2px solid #7b23a8;
      }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      row-gap: 0.25rem;
      text-align: center;
    }
    .weekday,
    .day {
      display: grid;
      place-items: center;
      height: 1.375rem;
      font-size: 0.75rem;
    }
    .weekday {
      color: var(--ink);
      font-weight: 500;
    }
    .day {
      color: #4a4a4a;
    }
    .today {
      width: 1.375rem;
      justify-self: center;
      border-radius: 50%;
      background: #7b23a8;
      color: #fff;
      font-weight: 600;
      outline: 2px solid #d6a4dc;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniCalendar {
  protected readonly weekdays = WEEKDAYS;
  private readonly now = new Date();
  /** First day of the shown month. */
  private readonly month = signal(new Date(this.now.getFullYear(), this.now.getMonth(), 1));

  protected readonly monthLabel = computed(() =>
    this.month().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  protected readonly cells = computed(() => {
    const first = this.month();
    const year = first.getFullYear();
    const month = first.getMonth();
    const leading = (first.getDay() + 6) % 7; // Monday-first offset
    const length = new Date(year, month + 1, 0).getDate();
    const isThisMonth = year === this.now.getFullYear() && month === this.now.getMonth();

    return [
      ...Array.from({ length: leading }, () => ({ day: '', today: false })),
      ...Array.from({ length }, (_, i) => ({
        day: String(i + 1),
        today: isThisMonth && i + 1 === this.now.getDate(),
      })),
    ];
  });

  protected shift(months: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + months, 1));
  }
}
