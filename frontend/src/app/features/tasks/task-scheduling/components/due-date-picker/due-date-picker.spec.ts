import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DueDatePicker } from './due-date-picker';

describe('DueDatePicker', () => {
  let fixture: ComponentFixture<DueDatePicker>;
  let page: HTMLElement;
  let control: FormControl<string>;

  const input = () => page.querySelector('#task-due-date') as HTMLInputElement;
  const clear = () => page.querySelector('.clear') as HTMLButtonElement | null;

  function render(value = '', error: string | null = null): void {
    control = new FormControl(value, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(DueDatePicker);
    page = fixture.nativeElement;
  });

  it('labels a date input and shows the current value', () => {
    render('2026-10-02');

    expect(page.querySelector('label[for="task-due-date"]')).toBeTruthy();
    expect(input().type).toBe('date');
    expect(input().value).toBe('2026-10-02');
  });

  it('updates the control and reports the edit when the user picks a date', () => {
    render();
    let edits = 0;
    fixture.componentInstance.edited.subscribe(() => edits++);

    input().value = '2026-10-09';
    input().dispatchEvent(new Event('input'));

    expect(control.value).toBe('2026-10-09');
    expect(edits).toBe(1);
  });

  it('announces an error and marks the input invalid', () => {
    render('', 'Repeating tasks need a due date.');

    const status = page.querySelector('#task-due-date-status');
    expect(status?.textContent?.trim()).toBe('Repeating tasks need a due date.');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(input().getAttribute('aria-describedby')).toBe('task-due-date-status');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('offers Clear only when there is a date', () => {
    render();
    expect(clear()).toBeNull();

    input().value = '2026-10-09';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(clear()?.type).toBe('button');
    expect(clear()?.getAttribute('aria-label')).toBe('Clear due date');
  });

  it('clears the date with Clear and reports the edit', () => {
    render('2026-10-02');
    let edits = 0;
    fixture.componentInstance.edited.subscribe(() => edits++);

    clear()?.click();
    fixture.detectChanges();

    expect(control.value).toBe('');
    expect(control.dirty).toBe(true);
    expect(edits).toBe(1);
    expect(clear()).toBeNull();
  });
});
