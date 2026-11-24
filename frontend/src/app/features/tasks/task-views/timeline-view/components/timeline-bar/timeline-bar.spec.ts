import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { timelineBar } from '../../testing/timeline-fixtures';
import type { ApiTimelineBar } from '../../types/task-timeline.types';
import { TimelineBar } from './timeline-bar';

const WEEK = { from: '2026-11-23', to: '2026-11-29' };

describe('TimelineBar', () => {
  let fixture: ComponentFixture<TimelineBar>;
  let host: HTMLElement;
  let events: string[];

  const bar = () => host.querySelector<HTMLElement>('.bar')!;
  const check = () => host.querySelector<HTMLButtonElement>('.check')!;
  const title = () => host.querySelector<HTMLButtonElement>('.title')!;
  const menuItems = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  function render(value: ApiTimelineBar, busy = false): void {
    fixture.componentRef.setInput('bar', value);
    fixture.componentRef.setInput('window', WEEK);
    fixture.componentRef.setInput('busy', busy);
    fixture.detectChanges();
  }

  function rightClick(): void {
    bar().dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 20 }),
    );
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineBar);
    host = fixture.nativeElement;
    events = [];
    fixture.componentInstance.open.subscribe(() => events.push('open'));
    fixture.componentInstance.toggleDone.subscribe(() => events.push('toggle'));
    fixture.componentInstance.archive.subscribe(() => events.push('archive'));
  });

  afterEach(() => fixture.destroy());

  it('sits from the start of its first day to the end of its last', () => {
    render(timelineBar(1, 'Draft recap', '2026-11-24', '2026-11-26'));
    expect(parseFloat(host.style.left)).toBeCloseTo((1 / 7) * 100);
    expect(parseFloat(host.style.width)).toBeCloseTo((3 / 7) * 100);
    expect(host.style.display).toBe('');
  });

  it('shows a round checkbox before the title', () => {
    render(timelineBar(41, 'Draft recap', '2026-11-24', '2026-11-26'));
    expect(check().getAttribute('role')).toBe('checkbox');
    expect(check().getAttribute('aria-checked')).toBe('false');
    expect(check().getAttribute('aria-label')).toBe('Mark Draft recap done');
    expect(
      check().compareDocumentPosition(title()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    render(timelineBar(41, 'Draft recap', '2026-11-24', '2026-11-26', { isDone: true }));
    expect(check().getAttribute('aria-checked')).toBe('true');
    expect(check().getAttribute('aria-label')).toBe('Mark Draft recap not done');
  });

  it('ticks the task without opening it, and waits while a change saves', () => {
    render(timelineBar(1, 'Draft', '2026-11-24'));
    check().click();
    expect(events).toEqual(['toggle']);

    render(timelineBar(1, 'Draft', '2026-11-24'), true);
    expect(check().disabled).toBe(true);
    check().click();
    expect(events).toEqual(['toggle']);
  });

  it('opens the task when its title or the bar is clicked', () => {
    render(timelineBar(1, 'Draft', '2026-11-24'));
    title().click();
    bar().click();
    expect(events).toEqual(['open', 'open']);
  });

  it('labels the title with the dates, and uses the project colour', () => {
    render(timelineBar(41, 'Draft recap', '2026-11-24', '2026-11-26'));
    expect(title().textContent?.trim()).toBe('Draft recap');
    expect(title().getAttribute('aria-label')).toBe('Draft recap, Nov 24 – Nov 26, 2026');
    expect(title().getAttribute('title')).toBe('Draft recap\nNov 24 – Nov 26, 2026');
    expect(bar().style.getPropertyValue('--project-color')).toBe('#2f7d6d');
  });

  it('offers Edit and Archive on right-click', () => {
    render(timelineBar(1, 'Draft', '2026-11-24'));
    rightClick();
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual(['Edit', 'Archive']);

    menuItems()[0].click();
    fixture.detectChanges();
    expect(events).toEqual(['open']);

    rightClick();
    menuItems()[1].click();
    fixture.detectChanges();
    expect(events).toEqual(['open', 'archive']);
  });

  it('shows and says when a task is overdue or completed', () => {
    render(timelineBar(1, 'Late', '2026-11-24', '2026-11-24', { isOverdue: true }));
    expect(bar().classList).toContain('overdue');
    expect(title().getAttribute('aria-label')).toBe('Late, Nov 24, 2026, Overdue');

    render(timelineBar(2, 'Finished', '2026-11-24', '2026-11-24', { isDone: true }));
    expect(bar().classList).toContain('done');
    expect(bar().classList).not.toContain('overdue');
    expect(title().getAttribute('aria-label')).toBe('Finished, Nov 24, 2026, Completed');
  });

  it('marks ends cut off by the window, and keeps the full dates in its label', () => {
    render(timelineBar(1, 'Long', '2026-11-20', '2026-12-02'));
    expect(bar().classList).toContain('cut-start');
    expect(bar().classList).toContain('cut-end');
    expect(host.querySelectorAll('.cut')).toHaveLength(2);
    expect(parseFloat(host.style.left)).toBe(0);
    expect(parseFloat(host.style.width)).toBeCloseTo(100);
    expect(title().getAttribute('aria-label')).toBe('Long, Nov 20 – Dec 2, 2026');
  });

  it('is hidden when wholly outside the window', () => {
    render(timelineBar(1, 'Later', '2026-12-10'));
    expect(host.style.display).toBe('none');
  });
});
