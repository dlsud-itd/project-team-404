import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { TimelineZoom } from '../../types/task-timeline.types';
import { TimelineHeader, type TimelineStep } from './timeline-header';

describe('TimelineHeader', () => {
  let fixture: ComponentFixture<TimelineHeader>;
  let host: HTMLElement;
  let steps: TimelineStep[];
  let zooms: TimelineZoom[];
  let completed: boolean[];

  const button = (text: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === text || b.getAttribute('aria-label') === text,
    )!;

  function render(zoom: TimelineZoom, from: string, to: string, showsToday = false): void {
    fixture.componentRef.setInput('zoom', zoom);
    fixture.componentRef.setInput('window', { from, to });
    fixture.componentRef.setInput('showsToday', showsToday);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineHeader);
    host = fixture.nativeElement;
    steps = [];
    zooms = [];
    completed = [];
    fixture.componentInstance.navigate.subscribe((step) => steps.push(step));
    fixture.componentInstance.zoomChange.subscribe((zoom) => zooms.push(zoom));
    fixture.componentInstance.includeCompletedChange.subscribe((on) => completed.push(on));
  });

  afterEach(() => fixture.destroy());

  it('names the week or month on screen', () => {
    render('week', '2026-11-23', '2026-11-29');
    expect(host.querySelector('.range')?.textContent?.trim()).toBe('Nov 23 – 29, 2026');

    render('month', '2026-11-01', '2026-11-30');
    expect(host.querySelector('.range')?.textContent?.trim()).toBe('November 2026');
  });

  it('moves to the previous or next window, and back to today', () => {
    render('week', '2026-11-30', '2026-12-06');
    button('Previous week').click();
    button('Next week').click();
    button('Today').click();
    expect(steps).toEqual(['prev', 'next', 'today']);
  });

  it('names the step buttons after the zoom and turns Today off while today is shown', () => {
    render('month', '2026-11-01', '2026-11-30', true);
    expect(button('Previous month')).toBeTruthy();
    expect(button('Next month')).toBeTruthy();
    expect(button('Today').disabled).toBe(true);
  });

  it('marks the current zoom and asks for the other one only', () => {
    render('week', '2026-11-23', '2026-11-29');
    expect(button('Week').getAttribute('aria-pressed')).toBe('true');
    expect(button('Month').getAttribute('aria-pressed')).toBe('false');

    button('Week').click();
    button('Month').click();
    expect(zooms).toEqual(['month']);
  });

  it('turns completed tasks on and off', () => {
    render('week', '2026-11-23', '2026-11-29');
    const box = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box.checked).toBe(false);
    box.click();
    box.click();
    expect(completed).toEqual([true, false]);
  });
});
