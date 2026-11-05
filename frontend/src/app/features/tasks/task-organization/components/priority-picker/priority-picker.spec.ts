import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TaskPriority } from '../../types/task-organization.types';
import { PriorityPicker } from './priority-picker';

describe('PriorityPicker', () => {
  let fixture: ComponentFixture<PriorityPicker>;
  let page: HTMLElement;
  let changes: (TaskPriority | null)[];

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const radios = () => Array.from(page.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const radio = (value: string) => el<HTMLInputElement>(`input[data-priority="${value}"]`)!;
  const pills = () => Array.from(page.querySelectorAll('.pill')).map((p) => p.textContent);

  function render(inputs: Record<string, unknown> = {}): void {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  function pick(value: string): void {
    radio(value).click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(PriorityPicker);
    page = fixture.nativeElement;
    changes = [];
    fixture.componentInstance.value.subscribe((v) => changes.push(v));
  });

  it('offers the three priorities, most urgent first, under a legend', () => {
    render();

    expect(el('legend')?.textContent).toBe('Priority');
    expect(pills()).toEqual(['High', 'Medium', 'Low']);
  });

  it('ticks the current priority', () => {
    render({ value: 'medium' });

    expect(radio('medium').checked).toBe(true);
    expect(radio('high').checked).toBe(false);
  });

  it('emits the priority the user picks', () => {
    render({ value: 'low' });

    pick('high');

    expect(changes).toEqual(['high']);
    expect(radio('high').checked).toBe(true);
  });

  it('does not emit when the current priority is picked again', () => {
    render({ value: 'low' });

    (fixture.componentInstance as unknown as { choose(p: TaskPriority): void }).choose('low');

    expect(changes).toEqual([]);
  });

  it('groups its radios under one name so arrow keys move between them', () => {
    render();

    const names = new Set(radios().map((r) => r.name));
    expect(names.size).toBe(1);
  });

  it('gives each picker its own radio group', () => {
    render();
    const other = TestBed.createComponent(PriorityPicker);
    other.detectChanges();

    const otherName = other.nativeElement.querySelector('input[type="radio"]').name;
    expect(otherName).not.toBe(radios()[0].name);
  });

  it('colors each pill by its priority', () => {
    render();

    const high = radio('high').closest('label') as HTMLElement;
    expect(high.style.getPropertyValue('--border')).toBe('#DC2626');
  });

  describe('with allowNone', () => {
    it('adds a first choice for no priority, ticked when the value is null', () => {
      render({ allowNone: true, noneLabel: 'Any' });

      expect(pills()).toEqual(['Any', 'High', 'Medium', 'Low']);
      expect(radio('').checked).toBe(true);
    });

    it('emits null when that choice is picked', () => {
      render({ allowNone: true, value: 'high' });

      pick('');

      expect(changes).toEqual([null]);
    });
  });

  it('has no none choice by default', () => {
    render();

    expect(el('input[data-priority=""]')).toBeNull();
  });

  it('cannot be changed while disabled', () => {
    render({ value: 'low', disabled: true });

    expect(el<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    (fixture.componentInstance as unknown as { choose(p: TaskPriority): void }).choose('high');

    expect(changes).toEqual([]);
  });

  it('can hide its legend visually but keep it for screen readers', () => {
    render({ legend: 'Task priority', hideLegend: true });

    expect(el('legend')?.textContent).toBe('Task priority');
    expect(el('legend')?.classList).toContain('visually-hidden');
  });
});
