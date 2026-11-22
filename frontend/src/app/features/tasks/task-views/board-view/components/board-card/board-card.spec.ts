import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { boardTask, card } from '../../testing/board-fixtures';
import type { BoardCard as BoardCardModel, BoardColumnKey } from '../../types/task-board.types';
import { BoardCard } from './board-card';

describe('BoardCard', () => {
  let fixture: ComponentFixture<BoardCard>;
  let host: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const menuButton = () => el<HTMLButtonElement>('.move')!;
  /** The open menu lives in the CDK overlay, outside the component. */
  const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  function render(model: BoardCardModel, column: BoardColumnKey = 'todo'): void {
    fixture.componentRef.setInput('card', model);
    fixture.componentRef.setInput('column', column);
    fixture.detectChanges();
  }

  function openMenu(): void {
    menuButton().click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(BoardCard);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('projectId', 10);
  });

  afterEach(() => fixture.destroy());

  it('links the title to the task', () => {
    render(card(boardTask(7, 'Write chapter 1')));
    const link = el<HTMLAnchorElement>('.open')!;
    expect(link.textContent?.trim()).toBe('Write chapter 1');
    expect(link.getAttribute('href')).toBe('/projects/10/tasks/7/edit');
  });

  it('shows priority, due date and labels', () => {
    render(
      card(
        boardTask(7, 'Write', {
          priorityId: 1,
          dueDate: '2099-01-05',
          labels: [
            { labelId: 1, name: 'School', color: '#2563EB' },
            { labelId: 2, name: 'Writing', color: null },
            { labelId: 3, name: 'Thesis', color: null },
            { labelId: 4, name: 'Group', color: null },
            { labelId: 5, name: 'Draft', color: null },
          ],
        }),
      ),
    );

    expect(text('.priority')).toBe('High');
    expect(text('.due')).toMatch(/^Due /);
    expect(el('.due')!.classList).not.toContain('overdue');
    expect([...host.querySelectorAll('.label')].map((l) => l.textContent?.trim())).toEqual([
      'School',
      'Writing',
      'Thesis',
      '+2',
    ]);
  });

  it('marks an open task past its due date as overdue, but not a done one', () => {
    const late = boardTask(7, 'Late', { dueDate: '2020-01-01' });
    render(card(late));
    expect(el('.due')!.classList).toContain('overdue');
    expect(text('.due')).toMatch(/^Overdue · /);

    render(card(late, true), 'done');
    expect(el('.due')!.classList).not.toContain('overdue');
    expect(el('.card')!.classList).toContain('done');
  });

  it('shows just the title when the details are missing', () => {
    render(card(boardTask(7, 'Bare'), false, false));
    expect(el('.priority')).toBeNull();
    expect(el('.meta')).toBeNull();
    expect(el('.labels')).toBeNull();
  });

  it('offers the other columns in its Move menu', () => {
    render(card(boardTask(7, 'Write')), 'inProgress');
    expect(menuButton().getAttribute('aria-label')).toBe('Move Write');
    expect(menuButton().id).toBe('board-card-7-move');

    openMenu();

    expect(
      items().map((i) => [i.textContent?.trim(), i.getAttribute('aria-disabled') === 'true']),
    ).toEqual([
      ['Move to To Do', false],
      ['Move to In Progress', true],
      ['Move to Done', false],
      ['Move up', true],
      ['Move down', true],
      ['Archive', false],
    ]);
  });

  it('asks to archive the card from its menu', () => {
    let archived = 0;
    fixture.componentInstance.archive.subscribe(() => archived++);
    render(card(boardTask(7, 'Write')));

    openMenu();
    items()[5].click();

    expect(archived).toBe(1);
  });

  it('reports the chosen column', () => {
    const moves: BoardColumnKey[] = [];
    fixture.componentInstance.moveTo.subscribe((to) => moves.push(to));
    render(card(boardTask(7, 'Write')));

    openMenu();
    items()[2].click();

    expect(moves).toEqual(['done']);
  });

  it('moves up and down when it can', () => {
    const steps: number[] = [];
    fixture.componentInstance.moveBy.subscribe((delta) => steps.push(delta));
    fixture.componentRef.setInput('canMoveUp', true);
    fixture.componentRef.setInput('canMoveDown', true);
    render(card(boardTask(7, 'Write')));

    openMenu();
    items()[3].click();
    openMenu();
    items()[4].click();

    expect(steps).toEqual([-1, 1]);
  });

  it('disables every move while another move is saving, but keeps the button focusable', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('canMoveUp', true);
    render(card(boardTask(7, 'Write')));
    expect(menuButton().disabled).toBe(false);

    openMenu();

    expect(items().every((i) => i.getAttribute('aria-disabled') === 'true')).toBe(true);
  });
});
