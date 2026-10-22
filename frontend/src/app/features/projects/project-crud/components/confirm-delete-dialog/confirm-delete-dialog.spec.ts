import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Project } from '../../../shared/types/project.types';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';

const CAPSTONE: Project = {
  projectId: 10,
  name: 'Capstone',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};

describe('ConfirmDeleteDialog', () => {
  let fixture: ComponentFixture<ConfirmDeleteDialog>;
  let page: HTMLElement;
  let confirmed: number;
  let cancelled: number;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T;

  function set(inputs: Record<string, unknown>): void {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ConfirmDeleteDialog] }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDeleteDialog);
    page = fixture.nativeElement;
    confirmed = 0;
    cancelled = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    set({ project: CAPSTONE });
  });

  it('names the project and says its tasks move to the Inbox', () => {
    expect(el('[role="alertdialog"]').getAttribute('aria-modal')).toBe('true');
    expect(el('#delete-title').textContent).toContain('Delete “Capstone”?');
    expect(el('#delete-description').textContent).toContain('moved to your Inbox');
  });

  it('starts with focus on Cancel', async () => {
    await fixture.whenStable();

    expect(document.activeElement).toBe(el('button.cancel'));
  });

  it('confirms when Delete project is clicked', () => {
    el<HTMLButtonElement>('button.confirm').click();

    expect(confirmed).toBe(1);
    expect(cancelled).toBe(0);
  });

  it('cancels from the Cancel button, the backdrop and Escape', () => {
    el<HTMLButtonElement>('button.cancel').click();
    el<HTMLElement>('.backdrop').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelled).toBe(3);
    expect(confirmed).toBe(0);
  });

  it('blocks both choices while the delete runs', () => {
    set({ busy: true });

    expect(el<HTMLButtonElement>('button.confirm').disabled).toBe(true);
    expect(el<HTMLButtonElement>('button.cancel').disabled).toBe(true);
    expect(el('button.confirm').textContent).toContain('Deleting…');

    el<HTMLElement>('.backdrop').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(0);
  });

  it('shows an error when one is given', () => {
    expect(el('.error')).toBeNull();

    set({ error: 'Something went wrong. Please try again.' });

    expect(el('[role="alert"]').textContent).toContain('Something went wrong');
  });
});
