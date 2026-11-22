import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import type { RecurrenceEnds, TaskRecurrence, Weekday } from '../../types/task-scheduling.types';
import { RecurrencePicker } from './recurrence-picker';

describe('RecurrencePicker', () => {
  let fixture: ComponentFixture<RecurrencePicker>;
  let page: HTMLElement;
  let control: FormControl<TaskRecurrence>;
  let days: FormControl<Weekday[]>;
  let ends: FormControl<RecurrenceEnds>;
  let endDate: FormControl<string>;

  const radios = () => [...page.querySelectorAll<HTMLInputElement>('.option input')];
  const radio = (label: string) =>
    [...page.querySelectorAll('.option')]
      .find((l) => l.textContent?.trim() === label)
      ?.querySelector('input') as HTMLInputElement;
  const dayBoxes = () => [...page.querySelectorAll<HTMLInputElement>('.day input')];
  const dayBox = (name: string) =>
    page.querySelector<HTMLInputElement>(`.day input[aria-label="${name}"]`)!;
  const endsRadio = (label: string) =>
    [...page.querySelectorAll('.end')]
      .find((l) => l.textContent?.trim() === label)
      ?.querySelector('input') as HTMLInputElement;
  const summary = () => page.querySelector('.summary')?.textContent?.trim();

  function render(
    value: TaskRecurrence = 'none',
    options: {
      error?: string | null;
      days?: Weekday[];
      ends?: RecurrenceEnds;
      endDate?: string;
      dueDate?: string;
    } = {},
  ): void {
    control = new FormControl(value, { nonNullable: true });
    days = new FormControl(options.days ?? [], { nonNullable: true });
    ends = new FormControl(options.ends ?? 'never', { nonNullable: true });
    endDate = new FormControl(options.endDate ?? '', { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('ends', ends);
    fixture.componentRef.setInput('endDate', endDate);
    fixture.componentRef.setInput('dueDate', options.dueDate ?? '');
    fixture.componentRef.setInput('error', options.error ?? null);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(RecurrencePicker);
    page = fixture.nativeElement;
  });

  it('groups one radio for each choice under a Repeat legend', () => {
    render();

    expect(page.querySelector('fieldset legend')?.textContent?.trim()).toBe('Repeat');
    expect(radios()).toHaveLength(4);
    expect(new Set(radios().map((r) => r.name)).size).toBe(1);
    expect([...page.querySelectorAll('label')].map((l) => l.textContent?.trim())).toEqual([
      'Never',
      'Daily',
      'Weekly',
      'Monthly',
    ]);
  });

  it('checks the current choice and describes it', () => {
    render('weekly', { days: [1] });

    expect(radio('Weekly').checked).toBe(true);
    expect(summary()).toBe('Repeats every week on Mon');
  });

  it('shows no summary, weekdays or Ends for a task that does not repeat', () => {
    render();

    expect(radio('Never').checked).toBe(true);
    expect(summary()).toBeUndefined();
    expect(dayBoxes()).toHaveLength(0);
    expect(page.querySelector('.ends')).toBeNull();
  });

  it('updates the control and reports the edit when the user chooses', () => {
    render();
    let edits = 0;
    fixture.componentInstance.edited.subscribe(() => edits++);

    radio('Monthly').click();
    fixture.detectChanges();

    expect(control.value).toBe('monthly');
    expect(edits).toBe(1);
    expect(summary()).toBe('Repeats every month');
  });

  it('announces an error', () => {
    render('none', { error: 'Invalid recurrence rule' });

    const status = page.querySelector('#task-recurrence-status');
    expect(status?.textContent?.trim()).toBe('Invalid recurrence rule');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(page.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(
      'task-recurrence-status',
    );
  });

  describe('weekly', () => {
    it('offers a checkbox for each day, Sunday to Saturday, under "Repeat on"', () => {
      render('weekly', { days: [1] });

      expect(page.querySelector('.weekdays legend')?.textContent?.trim()).toBe('Repeat on');
      expect(dayBoxes().map((b) => b.type)).toEqual(Array(7).fill('checkbox'));
      expect(dayBoxes().map((b) => b.getAttribute('aria-label'))).toEqual([
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]);
      expect(dayBoxes().map((b) => b.checked)).toEqual([
        false,
        true,
        false,
        false,
        false,
        false,
        false,
      ]);
    });

    it("starts a new weekly repeat on the due date's weekday", () => {
      // Nov 5, 2026 is a Thursday.
      render('none', { dueDate: '2026-11-05' });

      radio('Weekly').click();
      fixture.detectChanges();

      expect(days.value).toEqual([4]);
      expect(dayBox('Thursday').checked).toBe(true);
    });

    it('keeps days already chosen when switching back to weekly', () => {
      render('daily', { days: [0, 6], dueDate: '2026-11-05' });

      radio('Weekly').click();
      fixture.detectChanges();

      expect(days.value).toEqual([0, 6]);
    });

    it('ticks and unticks days, keeping them in week order', () => {
      render('weekly', { days: [3] });
      let edits = 0;
      fixture.componentInstance.edited.subscribe(() => edits++);

      dayBox('Friday').click();
      dayBox('Monday').click();
      fixture.detectChanges();
      expect(days.value).toEqual([1, 3, 5]);
      expect(summary()).toBe('Repeats every week on Mon, Wed and Fri');

      dayBox('Wednesday').click();
      fixture.detectChanges();
      expect(days.value).toEqual([1, 5]);
      expect(edits).toBe(3);
    });

    it('announces a days error', () => {
      render('weekly');
      fixture.componentRef.setInput('daysError', 'Pick at least one day.');
      fixture.detectChanges();

      expect(page.querySelector('#task-recurrence-days-status')?.textContent?.trim()).toBe(
        'Pick at least one day.',
      );
      expect(dayBoxes().every((b) => b.getAttribute('aria-invalid') === 'true')).toBe(true);
    });
  });

  describe('Ends', () => {
    it.each(['daily', 'weekly', 'monthly'] as const)(
      'offers Never and Date for a %s repeat',
      (recurrence) => {
        render(recurrence, { days: [1] });

        expect(page.querySelector('.ends legend')?.textContent?.trim()).toBe('Ends');
        expect(endsRadio('Never').checked).toBe(true);
        expect(endsRadio('Date').checked).toBe(false);
        expect(page.querySelector('#task-recurrence-end-date')).toBeNull();
      },
    );

    it('shows a date field, no earlier than the due date, once Date is chosen', () => {
      render('daily', { dueDate: '2026-11-05' });

      endsRadio('Date').click();
      fixture.detectChanges();

      expect(ends.value).toBe('date');
      const input = page.querySelector<HTMLInputElement>('#task-recurrence-end-date')!;
      expect(input.min).toBe('2026-11-05');

      input.value = '2026-12-31';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(endDate.value).toBe('2026-12-31');
      expect(summary()).toMatch(/^Repeats every day, until Dec 31(, 2026)?$/);
    });

    it('announces an end date error', () => {
      render('daily', { ends: 'date' });
      fixture.componentRef.setInput('endDateError', 'Pick the date the task stops repeating.');
      fixture.detectChanges();

      expect(page.querySelector('#task-recurrence-end-date-status')?.textContent?.trim()).toBe(
        'Pick the date the task stops repeating.',
      );
      expect(page.querySelector('#task-recurrence-end-date')?.getAttribute('aria-invalid')).toBe(
        'true',
      );
    });
  });
});
