import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import type { TaskRecurrence } from '../../types/task-scheduling.types';
import { RecurrencePicker } from './recurrence-picker';

describe('RecurrencePicker', () => {
  let fixture: ComponentFixture<RecurrencePicker>;
  let page: HTMLElement;
  let control: FormControl<TaskRecurrence>;

  const radios = () => [...page.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  const radio = (label: string) =>
    [...page.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === label)
      ?.querySelector('input') as HTMLInputElement;
  const summary = () => page.querySelector('.summary')?.textContent?.trim();

  function render(value: TaskRecurrence = 'none', error: string | null = null): void {
    control = new FormControl(value, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('error', error);
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
    render('weekly');

    expect(radio('Weekly').checked).toBe(true);
    expect(summary()).toBe('Repeats every week');
  });

  it('shows no summary for a task that does not repeat', () => {
    render();

    expect(radio('Never').checked).toBe(true);
    expect(summary()).toBeUndefined();
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
    render('none', 'Invalid recurrence rule');

    const status = page.querySelector('#task-recurrence-status');
    expect(status?.textContent?.trim()).toBe('Invalid recurrence rule');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(page.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(
      'task-recurrence-status',
    );
  });
});
