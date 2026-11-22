import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-footer',
  template: `
    <footer class="footer">
      <p class="brand">HabitTracker</p>
      <p class="tagline">
        Plan. Prioritize<br />
        <!-- The space sits inside the span: Angular drops whitespace-only text between tags. -->
        <span class="get-it">Get it </span><span class="done">done</span>
      </p>
      <p class="text">
        Tasks, projects, deadlines, priorities and labels, all on one dashboard that shows what's
        current, upcoming and overdue.
      </p>
      <p class="wordmark" aria-hidden="true">Habit Tracker</p>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }

    .footer {
      overflow: hidden;
      padding: 4rem var(--landing-gutter) 2rem;
      background: linear-gradient(180deg, #c8673c 0%, #a2496f 50%, #7a24a8 100%);
      color: #fff;
    }

    .brand {
      margin: 0 0 1.5rem;
      font-weight: 600;
    }

    .tagline {
      margin: 0 0 0.75rem;
      font-size: clamp(1.25rem, 3vw, 1.5rem);
      font-weight: 700;
      line-height: 1.1;
      text-transform: uppercase;
    }

    .get-it {
      color: var(--landing-orange);
    }

    .done {
      color: var(--purple);
    }

    .text {
      max-width: 19rem;
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .wordmark {
      margin: 2.5rem 0 0;
      color: rgba(255, 255, 255, 0.1);
      font-size: clamp(2.5rem, 10vw, 5rem);
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFooter {}
