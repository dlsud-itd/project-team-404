import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { boardTask, card } from '../../testing/board-fixtures';
import type { BoardCard, BoardColumnKey, BoardMove } from '../../types/task-board.types';
import { BoardColumn } from './board-column';

const OUTLINE = card(boardTask(1, 'Outline'));
const DRAFT = card(boardTask(2, 'Draft'));

describe('BoardColumn', () => {
  let fixture: ComponentFixture<BoardColumn>;
  let host: HTMLElement;
  let moves: BoardMove[];

  const el = <T extends HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const titles = () => [...host.querySelectorAll('.open')].map((n) => n.textContent?.trim());
  const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];

  function render(
    key: BoardColumnKey,
    cards: BoardCard[],
    count = cards.length,
    extra: Record<string, unknown> = {},
  ): void {
    fixture.componentRef.setInput('key', key);
    fixture.componentRef.setInput('cards', cards);
    fixture.componentRef.setInput('count', count);
    for (const [name, value] of Object.entries(extra)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  /** A CDK drop event, as the drop list would send it. */
  function drop(from: BoardColumnKey, previousIndex: number, currentIndex: number, taskId: number) {
    const container = { data: fixture.componentInstance.key() };
    const event = {
      item: { data: taskId },
      container,
      previousContainer: from === container.data ? container : { data: from },
      previousIndex,
      currentIndex,
    } as unknown as CdkDragDrop<BoardColumnKey, BoardColumnKey, number>;
    fixture.componentInstance['drop'](event);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(BoardColumn);
    host = fixture.nativeElement;
    fixture.componentRef.setInput('projectId', 10);
    moves = [];
    fixture.componentInstance.moved.subscribe((move) => moves.push(move));
  });

  afterEach(() => fixture.destroy());

  it('shows its name, count and cards in order', () => {
    render('inProgress', [DRAFT, OUTLINE]);
    expect(text('h2')).toBe('In Progress 2');
    expect(titles()).toEqual(['Draft', 'Outline']);
    expect(el('.toggle')).toBeNull();
  });

  it('shows a hint when empty', () => {
    render('todo', []);
    expect(text('.hint')).toBe('No tasks here.');
  });

  it('says when Done shows only the most recent tasks', () => {
    render('done', [OUTLINE], 80);
    expect(text('.count')).toBe('80');
    expect(text('.note')).toBe('Showing the 1 most recently completed.');
  });

  it('collapses Done but keeps somewhere to drop', () => {
    const toggles: void[] = [];
    fixture.componentInstance.toggled.subscribe(() => toggles.push(undefined));
    render('done', [OUTLINE], 1, { collapsible: true });

    const toggle = el<HTMLButtonElement>('.toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe('board-column-done-list');
    toggle.click();
    expect(toggles.length).toBe(1);

    render('done', [OUTLINE], 1, { collapsible: true, collapsed: true });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(titles()).toEqual([]);
    expect(text('.hint')).toBe('Drop a task here to mark it done');
  });

  it('reports a card dropped into it from another column', () => {
    render('done', [OUTLINE]);
    drop('todo', 3, 1, 9);
    expect(moves).toEqual([{ taskId: 9, to: 'done', index: 1 }]);
  });

  it('reports a reorder, but not a drop back in the same place', () => {
    render('todo', [OUTLINE, DRAFT]);
    drop('todo', 0, 0, 1);
    drop('todo', 0, 1, 1);
    expect(moves).toEqual([{ taskId: 1, to: 'todo', index: 1 }]);
  });

  it('turns Move menu choices into moves', () => {
    render('todo', [OUTLINE, DRAFT]);

    host.querySelectorAll<HTMLButtonElement>('.move')[1].click();
    fixture.detectChanges();
    items()[1].click(); // Move to In Progress
    host.querySelectorAll<HTMLButtonElement>('.move')[1].click();
    fixture.detectChanges();
    items()[3].click(); // Move up

    expect(moves).toEqual([
      { taskId: 2, to: 'inProgress', index: 0, fromMenu: true },
      { taskId: 2, to: 'todo', index: 0, fromMenu: true },
    ]);
  });

  it('locks dragging and menus while a move saves', () => {
    render('todo', [OUTLINE], 1, { busy: true });
    expect(el('.list')!.classList).toContain('cdk-drop-list-disabled');
    el<HTMLButtonElement>('.move')!.click();
    fixture.detectChanges();
    expect(items().every((i) => i.getAttribute('aria-disabled') === 'true')).toBe(true);
  });
});
