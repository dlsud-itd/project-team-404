import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ERRANDS, STUDY, URGENT } from '../../testing/helpers/api-label';
import type { Label } from '../../types/label.types';
import { LabelPicker } from './label-picker';

describe('LabelPicker', () => {
  let fixture: ComponentFixture<LabelPicker>;
  let page: HTMLElement;
  let changes: (readonly number[])[];

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const all = (selector: string) => Array.from(page.querySelectorAll(selector));
  const checkbox = (labelId: number) => el<HTMLInputElement>(`input[data-label-id="${labelId}"]`);
  const chosenNames = () => all('.chosen .name').map((e) => e.textContent);
  const optionNames = () => all('.option').map((e) => e.textContent?.trim());

  function render(
    labels: readonly Label[],
    selected: readonly number[] = [],
    disabled = false,
  ): void {
    fixture.componentRef.setInput('labels', labels);
    fixture.componentRef.setInput('selected', selected);
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
  }

  function search(text: string): void {
    const input = el<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelPicker);
    page = fixture.nativeElement;
    changes = [];
    fixture.componentInstance.selected.subscribe((ids) => changes.push(ids));
  });

  it('lists every label with a checkbox, ticking the chosen ones', () => {
    render([ERRANDS, STUDY, URGENT], [3]);

    expect(el('legend')?.textContent).toBe('Labels');
    expect(optionNames()).toEqual(['errands', 'Study', 'Urgent']);
    expect(checkbox(3)?.checked).toBe(true);
    expect(checkbox(5)?.checked).toBe(false);
    expect(chosenNames()).toEqual(['Study']);
  });

  it('adds a label when its box is ticked', () => {
    render([ERRANDS, STUDY], [3]);

    checkbox(5)!.click();
    fixture.detectChanges();

    expect(changes).toEqual([[3, 5]]);
    expect(chosenNames()).toEqual(['Study', 'errands']);
  });

  it('removes a label when its box is unticked', () => {
    render([ERRANDS, STUDY], [3, 5]);

    checkbox(3)!.click();
    fixture.detectChanges();

    expect(changes).toEqual([[5]]);
  });

  it('removes a label from its chip', () => {
    render([ERRANDS, STUDY], [3, 5]);

    el<HTMLButtonElement>('.chosen .remove')!.click();
    fixture.detectChanges();

    expect(changes).toEqual([[5]]);
    expect(checkbox(3)?.checked).toBe(false);
  });

  it('filters the options by name, ignoring case', () => {
    render([ERRANDS, STUDY, URGENT]);

    search('  ST ');

    expect(optionNames()).toEqual(['Study']);
  });

  it('says when no label matches the search', () => {
    render([ERRANDS, STUDY]);

    search('zzz');

    expect(all('.option')).toHaveLength(0);
    expect(el('.empty')?.textContent).toBe('No labels match “zzz”.');
  });

  it('keeps chosen labels shown while searching for others', () => {
    render([ERRANDS, STUDY], [3]);

    search('err');

    expect(chosenNames()).toEqual(['Study']);
  });

  it('skips chosen ids that are not among the labels', () => {
    render([STUDY], [3, 99]);

    expect(chosenNames()).toEqual(['Study']);
  });

  it('says when the user has no labels', () => {
    render([]);

    expect(el('input[type="search"]')).toBeNull();
    expect(el('.empty')?.textContent).toBe('You have no labels yet.');
  });

  it('cannot be changed while disabled', () => {
    render([ERRANDS, STUDY], [3], true);

    expect(el<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    // Calling through the component too, in case an event slips past the fieldset.
    (fixture.componentInstance as unknown as { toggle(id: number): void }).toggle(5);

    expect(changes).toEqual([]);
  });

  it('gives its search box a label', () => {
    render([STUDY]);

    const input = el<HTMLInputElement>('input[type="search"]')!;
    expect(el(`label[for="${input.id}"]`)?.textContent).toBe('Search labels');
  });

  it('uses a custom legend', () => {
    render([STUDY]);
    fixture.componentRef.setInput('legend', 'Task labels');
    fixture.detectChanges();

    expect(el('legend')?.textContent).toBe('Task labels');
  });
});
