import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DeadlinePicker } from './deadline-picker';

describe('DeadlinePicker', () => {
  let fixture: ComponentFixture<DeadlinePicker>;
  let page: HTMLElement;
  let control: FormControl<string>;

  const input = () => page.querySelector('#task-deadline') as HTMLInputElement;
  const clear = () => page.querySelector('.clear') as HTMLButtonElement | null;

  function render(value = '', dueDate = '', error: string | null = null): void {
    control = new FormControl(value, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('dueDate', dueDate);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(DeadlinePicker);
    page = fixture.nativeElement;
  });

  it('labels a date input and shows the current value', () => {
    render('2026-10-05');

    expect(page.querySelector('label[for="task-deadline"]')).toBeTruthy();
    expect(input().type).toBe('date');
    expect(input().value).toBe('2026-10-05');
  });

  it('starts the calendar at the due date', () => {
    render('', '2026-10-02');
    expect(input().min).toBe('2026-10-02');
  });

  it('has no minimum without a due date', () => {
    render();
    expect(input().hasAttribute('min')).toBe(false);
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
    render('2026-10-01', '2026-10-02', "The deadline can't be before the due date.");

    expect(page.querySelector('#task-deadline-status')?.textContent?.trim()).toBe(
      "The deadline can't be before the due date.",
    );
    expect(input().getAttribute('aria-describedby')).toBe('task-deadline-status');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('clears the date with Clear and reports the edit', () => {
    render('2026-10-05');
    let edits = 0;
    fixture.componentInstance.edited.subscribe(() => edits++);

    expect(clear()?.getAttribute('aria-label')).toBe('Clear deadline');
    clear()?.click();
    fixture.detectChanges();

    expect(control.value).toBe('');
    expect(edits).toBe(1);
    expect(clear()).toBeNull();
  });
});
