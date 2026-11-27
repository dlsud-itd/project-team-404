import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-footer',
  template: `
    <footer class="footer">
      <p class="brand">HabitFlow</p>
      <p class="tagline">
        Plan. Prioritize<br />
        <!-- The space sits inside the span: Angular drops whitespace-only text between tags. -->
        <span class="get-it">Get it </span><span class="done">done</span>
      </p>
      <p class="text">
        Tasks, projects, deadlines, priorities and labels, all on one dashboard that shows what's
        current, upcoming and overdue.
      </p>
      <p class="wordmark" aria-hidden="true">HabitFlow</p>
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }

    .footer {
      overflow: hidden;
      max-width: var(--landing-max);
      margin: 0 auto;
      padding: 4rem var(--landing-gutter) 2rem;
      border-top: 1px solid var(--divider);
      color: var(--ink);
    }

    .brand {
      margin: 0 0 1.5rem;
      font-weight: 600;
    }

    .tagline {
      margin: 0 0 0.75rem;
      font-size: clamp(1.25rem, 3vw, 1.5rem);
      font-weight: 500;
      line-height: 1.25;
    }

    .get-it,
    .done {
      color: var(--ink);
    }

    .text {
      max-width: 22rem;
      margin: 0;
      color: var(--ink-muted);
      font-size: 0.9375rem;
      line-height: 1.5;
    }

    /* The name set large and nearly invisible, like a watermark at the foot of the page. */
    .wordmark {
      margin: 3rem 0 0;
      color: color-mix(in srgb, var(--ink) 6%, transparent);
      font-size: clamp(3rem, 12vw, 8rem);
      font-weight: 600;
      line-height: 0.9;
      letter-spacing: -0.03em;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFooter {}
