import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { OverdueBadge } from './overdue-badge';

// Noon on Nov 6 in Manila.
const NOW = new Date('2026-11-06T04:00:00.000Z');

describe('OverdueBadge', () => {
  let fixture: ComponentFixture<OverdueBadge>;

  function render(endDate: string): string | undefined {
    fixture = TestBed.createComponent(OverdueBadge);
    fixture.componentRef.setInput('endDate', endDate);
    fixture.componentRef.setInput('now', NOW);
    fixture.componentRef.setInput('timeZone', 'Asia/Manila');
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.badge')?.textContent?.trim();
  }

  it('shows how many days late the task is', () => {
    expect(render('2026-11-03')).toBe('3 days overdue');
  });

  it('uses the singular for one day', () => {
    expect(render('2026-11-05')).toBe('1 day overdue');
  });

  it('says the task is due today on its end date', () => {
    expect(render('2026-11-06')).toBe('Due today');
  });
});
