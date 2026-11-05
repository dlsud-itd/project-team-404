import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ERRANDS, STUDY } from '../../../../labels/testing/helpers/api-label';
import { DEFAULT_TASK_FILTERS, type TaskFilters } from '../../types/task-organization.types';
import { TaskFilterBar } from './task-filter-bar';

describe('TaskFilterBar', () => {
  let fixture: ComponentFixture<TaskFilterBar>;
  let page: HTMLElement;
  let changes: TaskFilters[];

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const labelSelect = () => el<HTMLSelectElement>('.label-select')!;
  const sortSelect = () => el<HTMLSelectElement>('.sort-select')!;
  const direction = () => el<HTMLButtonElement>('.direction')!;
  const optionTexts = (select: HTMLSelectElement) =>
    Array.from(select.options).map((o) => o.textContent?.trim());
  const last = () => changes[changes.length - 1];

  function render(filters: Partial<TaskFilters> = {}, inputs: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('labels', [STUDY, ERRANDS]);
    fixture.componentRef.setInput('filters', { ...DEFAULT_TASK_FILTERS, ...filters });
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  function choose(select: HTMLSelectElement, value: string): void {
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskFilterBar);
    page = fixture.nativeElement;
    changes = [];
    fixture.componentInstance.filters.subscribe((f) => changes.push(f));
  });

  it('shows labelled priority, label and sort controls at their defaults', () => {
    render();

    expect(el('legend')?.textContent).toBe('Priority');
    expect(el<HTMLInputElement>('input[data-priority=""]')?.checked).toBe(true);
    expect(el(`label[for="${labelSelect().id}"]`)?.textContent).toBe('Label');
    expect(el(`label[for="${sortSelect().id}"]`)?.textContent).toBe('Sort by');
    expect(optionTexts(labelSelect())).toEqual(['Any label', 'Study', 'errands']);
    expect(optionTexts(sortSelect())).toEqual([
      'Default',
      'Due date',
      'Priority',
      'Title',
      'Date added',
    ]);
    expect(labelSelect().value).toBe('');
    expect(sortSelect().value).toBe('');
  });

  it('shows the current filters', () => {
    render({ priority: 'medium', labelId: 5, orderBy: 'title', orderDirection: 'desc' });

    expect(el<HTMLInputElement>('input[data-priority="medium"]')?.checked).toBe(true);
    expect(labelSelect().value).toBe('5');
    expect(sortSelect().value).toBe('title');
    expect(direction().textContent?.trim()).toBe('↓');
    expect(direction().getAttribute('aria-pressed')).toBe('true');
  });

  it('filters by the priority picked', () => {
    render({ labelId: 3 });

    el<HTMLInputElement>('input[data-priority="high"]')!.click();
    fixture.detectChanges();

    expect(last()).toEqual({ ...DEFAULT_TASK_FILTERS, labelId: 3, priority: 'high' });
  });

  it('filters by the label chosen, and clears it with "Any label"', () => {
    render();

    choose(labelSelect(), '3');
    expect(last().labelId).toBe(3);

    choose(labelSelect(), '');
    expect(last().labelId).toBeNull();
  });

  it('sorts by the option chosen, ascending to start', () => {
    render();

    choose(sortSelect(), 'priority');

    expect(last()).toEqual({ ...DEFAULT_TASK_FILTERS, orderBy: 'priority', orderDirection: 'asc' });
  });

  it('flips the direction of a sort', () => {
    render({ orderBy: 'dueDate' });

    direction().click();
    fixture.detectChanges();
    expect(last().orderDirection).toBe('desc');
    expect(direction().getAttribute('aria-label')).toBe('Descending order');

    direction().click();
    fixture.detectChanges();
    expect(last().orderDirection).toBe('asc');
  });

  it('turns the direction off with the default order', () => {
    render({ orderBy: 'title', orderDirection: 'desc' });

    choose(sortSelect(), '');

    expect(last()).toEqual(DEFAULT_TASK_FILTERS);
    expect(direction().disabled).toBe(true);
  });

  it('shows Clear only when something is set, and resets everything', () => {
    render();
    expect(el('.clear')).toBeNull();

    render({ priority: 'low', labelId: 3, orderBy: 'title', orderDirection: 'desc' });
    el<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();

    expect(last()).toEqual(DEFAULT_TASK_FILTERS);
    expect(el('.clear')).toBeNull();
  });

  it('keeps a filter on a deleted label visible so it can be cleared', () => {
    render({ labelId: 99 });

    expect(labelSelect().value).toBe('99');
    expect(optionTexts(labelSelect())).toContain('Deleted label');
  });

  it('disables every control while disabled', () => {
    render({ orderBy: 'title', priority: 'low' }, { disabled: true });

    expect(el<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    expect(labelSelect().disabled).toBe(true);
    expect(sortSelect().disabled).toBe(true);
    expect(direction().disabled).toBe(true);
    expect(el<HTMLButtonElement>('.clear')?.disabled).toBe(true);
  });

  it('ignores changes while disabled', () => {
    render({}, { disabled: true });

    choose(labelSelect(), '3');

    expect(changes).toEqual([]);
  });
});
