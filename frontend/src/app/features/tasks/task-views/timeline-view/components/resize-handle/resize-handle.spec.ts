import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { pointer } from '../../testing/timeline-fixtures';
import { ResizeHandle, type ResizeStep } from './resize-handle';

describe('ResizeHandle', () => {
  let fixture: ComponentFixture<ResizeHandle>;
  let host: HTMLElement;
  let events: (string | number)[];

  function render(inputs: { value?: number | null; focusable?: boolean } = {}): void {
    fixture.componentRef.setInput('label', 'Resize task names column');
    fixture.componentRef.setInput('min', 96);
    fixture.componentRef.setInput('max', 480);
    fixture.componentRef.setInput('value', inputs.value ?? null);
    fixture.componentRef.setInput('focusable', inputs.focusable ?? true);
    fixture.detectChanges();
  }

  const press = (key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ResizeHandle);
    host = fixture.nativeElement;
    events = [];
    const handle = fixture.componentInstance;
    handle.resizeStart.subscribe(() => events.push('start'));
    handle.resizeBy.subscribe((dx) => events.push(dx));
    handle.resizeEnd.subscribe(() => events.push('end'));
    handle.resizeStep.subscribe((step: ResizeStep) => events.push(`step ${step}`));
    handle.reset.subscribe(() => events.push('reset'));
  });

  afterEach(() => fixture.destroy());

  it('is a labelled vertical separator that says its width', () => {
    render({ value: 240 });
    expect(host.getAttribute('role')).toBe('separator');
    expect(host.getAttribute('aria-orientation')).toBe('vertical');
    expect(host.getAttribute('aria-label')).toBe('Resize task names column');
    expect(host.getAttribute('aria-valuenow')).toBe('240');
    expect(host.getAttribute('aria-valuetext')).toBe('240 pixels');
    expect(host.getAttribute('aria-valuemin')).toBe('96');
    expect(host.getAttribute('aria-valuemax')).toBe('480');
    expect(host.getAttribute('tabindex')).toBe('0');
    expect(host.getAttribute('aria-hidden')).toBeNull();
  });

  it('says when the width is the default', () => {
    render();
    expect(host.getAttribute('aria-valuenow')).toBeNull();
    expect(host.getAttribute('aria-valuetext')).toBe('Default width');
  });

  it('is left out of the Tab order and screen readers when another handle does its job', () => {
    render({ focusable: false });
    expect(host.getAttribute('tabindex')).toBeNull();
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('reports how far a drag has moved from where it began', () => {
    render();
    host.dispatchEvent(pointer('pointerdown', 100));
    host.dispatchEvent(pointer('pointermove', 130));
    host.dispatchEvent(pointer('pointermove', 80));
    host.dispatchEvent(pointer('pointerup', 80));
    // Moves after the drag ended are ignored.
    host.dispatchEvent(pointer('pointermove', 200));
    expect(events).toEqual(['start', 30, -20, 'end']);
  });

  it('shows that it is being dragged, and ends on a cancelled pointer too', () => {
    render();
    host.dispatchEvent(pointer('pointerdown', 10));
    fixture.detectChanges();
    expect(host.classList).toContain('dragging');

    host.dispatchEvent(pointer('pointercancel', 10));
    fixture.detectChanges();
    expect(host.classList).not.toContain('dragging');
    expect(events).toEqual(['start', 'end']);
  });

  it('ignores buttons other than the main one', () => {
    render();
    host.dispatchEvent(pointer('pointerdown', 10, 2));
    host.dispatchEvent(pointer('pointermove', 50));
    expect(events).toEqual([]);
  });

  it('steps with the arrow keys, jumps with Home and End, and resets with Enter', () => {
    render();
    const handled = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].map(press);
    expect(events).toEqual(['step -1', 'step 1', 'step min', 'step max', 'reset']);
    expect(handled.every((event) => event.defaultPrevented)).toBe(true);

    // Other keys, such as Tab, still do their usual job.
    expect(press('Tab').defaultPrevented).toBe(false);
  });

  it('resets on double-click', () => {
    render();
    host.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(events).toEqual(['reset']);
  });
});
