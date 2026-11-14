import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILT_IN_PRIORITIES } from '../../../../settings/state/priorities.store';
import type { Label } from '../../services/label.service';
import { DEFAULT_TASK_QUERY, type TaskQuery } from '../../types/task-query.types';
import { TaskFilterBar } from './filter-bar';

const LABELS: Label[] = [
  { labelId: 4, name: 'Planning', color: '#54A6A1' },
  { labelId: 9, name: 'Study', color: null },
  { labelId: 12, name: 'Home', color: null },
];

describe('TaskFilterBar', () => {
  let fixture: ComponentFixture<TaskFilterBar>;
  let host: HTMLElement;
  let changes: Partial<TaskQuery>[];
  let cleared: number;

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') ?? '';
  const chip = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>('.chip')].find((c) =>
      clean(c.textContent).startsWith(name),
    )!;
  const options = () => [...host.querySelectorAll<HTMLLabelElement>('.panel .option')];
  const option = (text: string) => options().find((o) => clean(o.textContent) === text)!;

  function render(query: Partial<TaskQuery> = {}): void {
    fixture.componentRef.setInput('query', { ...DEFAULT_TASK_QUERY, ...query });
    fixture.detectChanges();
  }

  function openChip(name: string): void {
    chip(name).click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(TaskFilterBar);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('levels', BUILT_IN_PRIORITIES);
    fixture.componentRef.setInput('labels', LABELS);
    changes = [];
    cleared = 0;
    fixture.componentInstance.changed.subscribe((change) => changes.push(change));
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    render();
  });

  it('names each chip and says what it is filtering by', () => {
    expect([...host.querySelectorAll('.chip')].map((c) => clean(c.textContent))).toEqual([
      'Priority',
      'Labels',
      'Due',
      'Repeat',
      'Status',
    ]);

    render({
      priorities: ['high', 'medium', 'low'],
      labelIds: [4, 9],
      labelMatch: 'all',
      due: 'next7',
      recurring: false,
      status: 'completed',
    });

    expect(clean(chip('Priority').textContent)).toBe('Priority: High +2');
    expect(clean(chip('Labels').textContent)).toBe('Labels (all): Planning, Study');
    expect(clean(chip('Due').textContent)).toBe('Due: Next 7 days');
    expect(clean(chip('One-time').textContent)).toBe('One-time');
    expect(clean(chip('Status').textContent)).toBe('Status: Completed');
    expect(host.querySelectorAll('.chip.active')).toHaveLength(5);
  });

  it('opens a chip as a disclosure and closes it on a second press', () => {
    const priority = chip('Priority');
    expect(priority.getAttribute('aria-expanded')).toBe('false');
    expect(priority.getAttribute('aria-controls')).toBe('task-filter-priority');

    openChip('Priority');
    expect(priority.getAttribute('aria-expanded')).toBe('true');
    expect(el('#task-filter-priority legend')?.textContent).toBe('Priority');
    expect(options().map((o) => clean(o.textContent))).toEqual(['High', 'Medium', 'Low']);

    openChip('Priority');
    expect(el('#task-filter-priority')).toBeNull();
  });

  it('only keeps one panel open at a time', () => {
    openChip('Priority');
    openChip('Status');

    expect(el('#task-filter-priority')).toBeNull();
    expect(el('#task-filter-status')).toBeTruthy();
  });

  it('adds and removes priorities with checkboxes', () => {
    render({ priorities: ['high'] });
    openChip('Priority');

    expect(option('High').querySelector('input')!.checked).toBe(true);
    option('Low').querySelector('input')!.click();
    option('High').querySelector('input')!.click();

    expect(changes).toEqual([{ priorities: ['high', 'low'] }, { priorities: [] }]);
  });

  it('offers Any / All matching once two labels are picked', () => {
    openChip('Labels');
    expect(el('.match')).toBeNull();

    render({ labelIds: [4, 9] });
    expect(clean(el('.match legend')?.textContent)).toBe('Show tasks with');

    option('All of these labels').querySelector('input')!.click();
    option('Home').querySelector('input')!.click();

    expect(changes).toEqual([{ labelMatch: 'all' }, { labelIds: [4, 9, 12] }]);
  });

  it('picks a due preset, repeat and status with radios', () => {
    openChip('Due');
    option('Overdue').querySelector('input')!.click();
    openChip('Repeat');
    option('Repeating').querySelector('input')!.click();
    openChip('Status');
    option('Active').querySelector('input')!.click();

    expect(changes).toEqual([{ due: 'overdue' }, { recurring: true }, { status: 'active' }]);
  });

  it('shows labelled date fields for a custom range and moves focus to the first', async () => {
    openChip('Due');
    option('Custom range…').querySelector('input')!.click();
    expect(changes).toEqual([{ due: 'custom' }]);

    render({ due: 'custom' });
    await fixture.whenStable();

    const from = el<HTMLInputElement>('.range input')!;
    expect(clean(from.closest('label')?.textContent)).toBe('From');
    expect(document.activeElement).toBe(from);

    from.value = '2026-11-10';
    from.dispatchEvent(new Event('change'));
    expect(changes.at(-1)).toEqual({ due: 'custom', dueFrom: '2026-11-10' });
  });

  it('flags a range that ends before it starts', () => {
    render({ due: 'custom', dueFrom: '2026-11-30', dueTo: '2026-11-01' });

    expect(el('[role="alert"]')?.textContent).toContain('“From” must be on or before “To”.');
    expect(el('.range input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the filter count with Clear all and announces it', () => {
    const live = el('[aria-live="polite"]')!;
    expect(el('.clear')).toBeNull();
    expect(live.textContent).toBe('No filters applied');

    render({ status: 'active', recurring: true });
    expect(clean(el('.count')?.textContent)).toBe('2 filters');
    expect(live.textContent).toBe('2 filters applied');

    el<HTMLButtonElement>('.clear')!.click();
    expect(cleared).toBe(1);
  });

  it('closes with Escape, returning focus to the chip', () => {
    openChip('Status');
    const radio = el<HTMLInputElement>('#task-filter-status input')!;
    radio.focus();

    radio.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el('#task-filter-status')).toBeNull();
    expect(document.activeElement).toBe(chip('Status'));
  });

  it('closes when the user clicks elsewhere on the page', () => {
    openChip('Status');

    document.body.click();
    fixture.detectChanges();

    expect(el('#task-filter-status')).toBeNull();
  });
});
