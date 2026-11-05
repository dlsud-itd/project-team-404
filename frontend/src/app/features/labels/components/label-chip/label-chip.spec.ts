import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ERRANDS, STUDY } from '../../testing/helpers/api-label';
import type { Label } from '../../types/label.types';
import { LabelChip } from './label-chip';

describe('LabelChip', () => {
  let fixture: ComponentFixture<LabelChip>;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;

  function render(label: Label, inputs: { removable?: boolean; disabled?: boolean } = {}): void {
    fixture.componentRef.setInput('label', label);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(LabelChip);
    page = fixture.nativeElement;
  });

  it('shows the name with its color', () => {
    render(STUDY);

    expect(el('.name')?.textContent).toBe('Study');
    expect(el('.dot')?.style.background).toBe('rgb(37, 99, 235)');
    expect(el('.chip')?.style.borderColor).toBe('rgb(37, 99, 235)');
  });

  it('shows a hollow dot for a label with no color', () => {
    render(ERRANDS);

    expect(el('.dot')?.classList).toContain('none');
    expect(el('.dot')?.style.background).toBe('');
  });

  it('has no remove button unless removable', () => {
    render(STUDY);

    expect(el('.remove')).toBeNull();
  });

  it('emits the label when its remove button is clicked', () => {
    const removed: Label[] = [];
    fixture.componentInstance.removed.subscribe((l) => removed.push(l));
    render(STUDY, { removable: true });

    const button = el<HTMLButtonElement>('.remove')!;
    expect(button.getAttribute('aria-label')).toBe('Remove label Study');
    button.click();

    expect(removed).toEqual([STUDY]);
  });

  it('disables the remove button when disabled', () => {
    render(STUDY, { removable: true, disabled: true });

    expect(el<HTMLButtonElement>('.remove')?.disabled).toBe(true);
  });
});
