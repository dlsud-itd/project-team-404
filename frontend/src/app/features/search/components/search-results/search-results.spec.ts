import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  SearchProjectResult,
  SearchResult,
  SearchState,
  SearchTaskResult,
} from '../../types/search.types';
import { SearchResults } from './search-results';

const TASK: SearchTaskResult = {
  kind: 'task',
  id: 9,
  title: 'Buy oat milk',
  projectId: 5,
  projectName: 'Home',
  projectColor: '#2563EB',
  priorityName: 'High',
  priorityColor: '#D84A4A',
  dueDate: '2026-11-24',
  inDescription: false,
  snippet: 'Buy oat milk',
  isArchived: false,
};

const DESCRIPTION_TASK: SearchTaskResult = {
  ...TASK,
  id: 12,
  title: 'Groceries',
  projectName: null,
  priorityName: null,
  priorityColor: null,
  dueDate: null,
  inDescription: true,
  snippet: 'remember the milk',
};

const PROJECT: SearchProjectResult = {
  kind: 'project',
  id: 5,
  name: 'Milk run',
  color: '#00aa00',
  inDescription: false,
  snippet: 'Milk run',
  isArchived: true,
};

describe('SearchResults', () => {
  let fixture: ComponentFixture<SearchResults>;
  let el: HTMLElement;

  const all = (selector: string) => [...el.querySelectorAll<HTMLElement>(selector)];
  const one = (selector: string) => el.querySelector<HTMLElement>(selector);

  function render(
    inputs: Partial<{
      tasks: SearchTaskResult[];
      projects: SearchProjectResult[];
      counts: { tasks: number; projects: number };
      query: string;
      state: SearchState;
      mode: 'dropdown' | 'page';
      activeId: string | null;
      includeArchived: boolean;
      show: 'all' | 'tasks' | 'projects';
    }> = {},
  ): void {
    const values = {
      tasks: [TASK, DESCRIPTION_TASK],
      projects: [PROJECT],
      counts: { tasks: 2, projects: 1 },
      query: 'milk',
      state: 'done' as SearchState,
      ...inputs,
    };
    for (const [key, value] of Object.entries(values)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchResults);
    el = fixture.nativeElement;
  });

  it('groups results into Tasks and Projects with the server counts', () => {
    render({ counts: { tasks: 7, projects: 1 } });
    expect(all('.group-heading').map((h) => h.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Tasks 7',
      'Projects 1',
    ]);
    expect(all('[role="option"]')).toHaveLength(3);
  });

  it('is a listbox with options in the dropdown', () => {
    render({ activeId: 'search-task-9' });
    expect(one('#search-listbox')?.getAttribute('role')).toBe('listbox');
    const active = one('#search-task-9');
    expect(active?.getAttribute('role')).toBe('option');
    expect(active?.getAttribute('aria-selected')).toBe('true');
    expect(active?.classList).toContain('active');
    expect(one('#search-task-12')?.getAttribute('aria-selected')).toBe('false');
  });

  it('is a plain list of buttons on the search page', () => {
    render({ mode: 'page' });
    expect(all('[role="option"]')).toHaveLength(0);
    expect(all('button.row')).toHaveLength(3);
    expect(one('.archived-toggle')).toBeNull();
  });

  it('highlights the matching text', () => {
    render();
    expect(all('mark').map((m) => m.textContent)).toEqual(['milk', 'milk', 'Milk']);
  });

  it('shows the project, priority and due date of a task', () => {
    render();
    const row = one('#search-task-9')!;
    expect(row.querySelector('.project')?.textContent?.trim()).toBe('Home');
    expect(row.querySelector<HTMLElement>('.priority')?.style.background).toBeTruthy();
    expect(row.querySelector('.priority')?.classList).not.toContain('unknown');
    expect(row.querySelector('.due')?.textContent).toContain('Nov 24');
  });

  it('tags description matches and shows the snippet', () => {
    render();
    const row = one('#search-task-12')!;
    expect(row.querySelector('.tag')?.textContent?.trim()).toBe('in description');
    expect(row.querySelector('.snippet')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'remember the milk',
    );
    expect(row.querySelector('.priority')?.classList).toContain('unknown');
    expect(row.querySelector('.due')).toBeNull();
    expect(one('#search-task-9 .snippet')).toBeNull();
  });

  it('marks archived results', () => {
    render();
    expect(one('#search-project-5 .tag.archived')?.textContent?.trim()).toBe('Archived');
  });

  it('never renders result text or the query as HTML', () => {
    const hostile = '<img src=x onerror="window.__xss=1">';
    render({
      tasks: [{ ...TASK, title: `${hostile} milk` }],
      projects: [],
      query: hostile,
    });
    expect(el.querySelector('img')).toBeNull();
    expect(one('#search-task-9 .title')?.textContent).toContain('<img src=x');
    expect(one('mark')?.textContent).toBe(hostile);
  });

  it('shows the loading, empty and error states', () => {
    render({ state: 'loading' });
    expect(one('[role="status"]')?.textContent).toContain('Searching');
    expect(all('.row')).toHaveLength(0);

    render({ state: 'done', tasks: [], projects: [], counts: { tasks: 0, projects: 0 } });
    expect(one('[role="status"]')?.textContent).toContain('No tasks or projects match');
    expect(one('[role="status"]')?.textContent).toContain('Archived items are hidden');

    render({ state: 'error' });
    expect(one('[role="alert"]')?.textContent).toContain("Search isn't working");
  });

  it('shows only the chosen group', () => {
    render({ mode: 'page', show: 'projects' });
    expect(all('.group-heading').map((h) => h.textContent?.trim())).toEqual(['Projects 1']);
  });

  it('emits when a result is clicked or hovered', () => {
    const opened: SearchResult[] = [];
    const activated: SearchResult[] = [];
    fixture.componentInstance.opened.subscribe((r) => opened.push(r));
    fixture.componentInstance.activated.subscribe((r) => activated.push(r));
    render();
    one('#search-project-5')!.dispatchEvent(new MouseEvent('mouseenter'));
    one('#search-project-5')!.click();
    expect(activated).toEqual([PROJECT]);
    expect(opened).toEqual([PROJECT]);
  });

  it('emits the archived switch, retry and see all', () => {
    const archived: boolean[] = [];
    let retried = 0;
    let seeAll = 0;
    fixture.componentInstance.includeArchivedChange.subscribe((v) => archived.push(v));
    fixture.componentInstance.retry.subscribe(() => retried++);
    fixture.componentInstance.seeAll.subscribe(() => seeAll++);

    render({ counts: { tasks: 9, projects: 1 } });
    one('.archived-toggle input')!.click();
    expect(archived).toEqual([true]);
    expect(one('.see-all')?.textContent).toContain('See all results');
    one('.see-all')!.click();
    expect(seeAll).toBe(1);

    render({ state: 'error' });
    one('.retry')!.click();
    expect(retried).toBe(1);
  });
});
