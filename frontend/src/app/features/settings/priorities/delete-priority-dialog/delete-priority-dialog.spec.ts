import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PriorityLevel } from '../../types/settings.types';
import { DeletePriorityDialog } from './delete-priority-dialog';

const LOW: PriorityLevel = {
  id: 1,
  name: 'Low',
  color: '#6E9F79',
  sortOrder: 0,
  isDefault: false,
  taskCount: 0,
};
const MEDIUM: PriorityLevel = {
  id: 2,
  name: 'Medium',
  color: '#D59B38',
  sortOrder: 1,
  isDefault: true,
  taskCount: 5,
};
const HIGH: PriorityLevel = {
  id: 3,
  name: 'High',
  color: '#D84A4A',
  sortOrder: 2,
  isDefault: false,
  taskCount: 3,
};

describe('DeletePriorityDialog', () => {
  let fixture: ComponentFixture<DeletePriorityDialog>;
  let page: HTMLElement;
  let confirmed: (number | null)[];
  let cancelled: number;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector);
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const button = (label: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === label,
    );

  function open(level: PriorityLevel, levels: PriorityLevel[] = [LOW, MEDIUM, HIGH]): void {
    fixture = TestBed.createComponent(DeletePriorityDialog);
    page = fixture.nativeElement;
    fixture.componentRef.setInput('level', level);
    fixture.componentRef.setInput('levels', levels);
    confirmed = [];
    cancelled = 0;
    fixture.componentInstance.confirmed.subscribe((id) => confirmed.push(id));
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    fixture.detectChanges();
  }

  function choose(id: number): void {
    const select = el<HTMLSelectElement>('#reassign-priority')!;
    select.value = String(id);
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeletePriorityDialog] }).compileComponents();
  });

  it('is a modal alert dialog naming the level and how many tasks use it', () => {
    open(HIGH);

    const dialog = el('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(text('#delete-priority-title')).toBe('Delete “High”?');
    expect(dialog.getAttribute('aria-labelledby')).toBe('delete-priority-title');
    expect(text('#delete-priority-impact')).toBe(
      '3 tasks use this level and will move to the level you choose.',
    );
  });

  it('offers every other level as a target and requires one when tasks use the level', () => {
    open(HIGH);

    const select = el<HTMLSelectElement>('#reassign-priority')!;
    expect(select.required).toBe(true);
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Choose a level…',
      'Low',
      'Medium (default)',
    ]);

    button('Delete level')!.click();
    fixture.detectChanges();
    expect(confirmed).toEqual([]);
    expect(text('#reassign-priority-status')).toBe('Choose where its tasks go.');
    expect(select.getAttribute('aria-invalid')).toBe('true');

    choose(1);
    expect(text('#reassign-priority-status')).toBe('');
    button('Delete level')!.click();
    expect(confirmed).toEqual([1]);
  });

  it('asks for a target when the task count is unknown', () => {
    open({ ...HIGH, taskCount: null });
    expect(el('#reassign-priority')).toBeTruthy();
    expect(text('#delete-priority-impact')).toBe('Tasks on this level need a new one.');
  });

  it('deletes an unused level without asking where tasks go', () => {
    open(LOW);

    expect(el('#reassign-priority')).toBeNull();
    expect(text('#delete-priority-impact')).toBe('No tasks use this level.');
    button('Delete level')!.click();
    expect(confirmed).toEqual([null]);
  });

  it('says the target becomes the default when the default level is deleted', () => {
    open(MEDIUM);
    expect(text('.note')).toContain('the level you choose becomes the default');

    open({ ...MEDIUM, taskCount: 0 });
    expect(text('.note')).toContain('Low becomes the default');
    button('Delete level')!.click();
    // The first remaining level takes over the default flag.
    expect(confirmed).toEqual([1]);
  });

  it('will not delete the last level', () => {
    open(LOW, [LOW]);

    expect(text('#delete-priority-impact')).toContain('This is your only priority level.');
    expect(button('Delete level')).toBeUndefined();
    expect(el('#reassign-priority')).toBeNull();
  });

  it('cancels from the button or Escape, and disables both buttons while busy', () => {
    open(HIGH);
    button('Cancel')!.click();
    el('[role="alertdialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(2);

    fixture.componentRef.setInput('busy', true);
    fixture.componentRef.setInput('error', "Couldn't delete the priority. Please try again.");
    fixture.detectChanges();
    expect(button('Cancel')!.disabled).toBe(true);
    expect(button('Deleting…')!.disabled).toBe(true);
    expect(text('[role="alert"]')).toBe("Couldn't delete the priority. Please try again.");
  });

  it('starts with focus on Cancel', async () => {
    open(HIGH);
    await fixture.whenStable();
    expect(document.activeElement).toBe(button('Cancel'));
  });
});
