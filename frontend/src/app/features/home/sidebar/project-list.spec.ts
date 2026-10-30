import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardStore } from '../dashboard.store';
import { ProjectList } from './project-list';

describe('ProjectList (sidebar)', () => {
  let fixture: ComponentFixture<ProjectList>;
  let store: DashboardStore;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const render = () => fixture.detectChanges();
  const row = (name: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('button.row')].find(
      (b) => b.querySelector('.name')?.textContent === name,
    )!;
  const names = () => [...page.querySelectorAll('.project .name')].map((n) => n.textContent);

  function submitName(selector: string, value: string): void {
    el<HTMLInputElement>(selector)!.value = value;
    el<HTMLFormElement>('form.name-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    render();
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0));
    await TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [DashboardStore],
    }).compileComponents();
    store = TestBed.inject(DashboardStore);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => vi.useRealTimers());

  it('lists All Projects and each project with its open-task count', () => {
    expect(row('All Projects').querySelector('.count')?.textContent).toBe('8');
    expect(names()).toEqual(['School', 'Work', 'Personal']);
    expect(row('School').querySelector('.count')?.textContent).toBe('3');
  });

  it('toggles a project filter, with aria-pressed following it', () => {
    row('Work').click();
    render();
    expect(store.filter()).toEqual({ projectId: 2 });
    expect(row('Work').getAttribute('aria-pressed')).toBe('true');
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('false');

    row('Work').click();
    render();
    expect(store.filter()).toEqual({});
    expect(row('All Projects').getAttribute('aria-pressed')).toBe('true');

    row('Work').click();
    row('All Projects').click();
    render();
    expect(store.filter()).toEqual({});
  });

  it('adds a trimmed project and ignores a blank name', () => {
    el<HTMLButtonElement>('button[aria-label="Add project"]')!.click();
    render();
    submitName('input[aria-label="New project name"]', '   ');
    expect(names()).toHaveLength(3);

    submitName('input[aria-label="New project name"]', '  Thesis ');
    expect(names()).toEqual(['School', 'Work', 'Personal', 'Thesis']);
    expect(el('input[aria-label="New project name"]')).toBeNull();
  });

  it('renames a project and keeps the old name when the new one is blank', () => {
    el<HTMLButtonElement>('button[aria-label="Rename School"]')!.click();
    render();
    submitName('input[aria-label="Project name"]', '   ');
    expect(names()).toEqual(['School', 'Work', 'Personal']);

    el<HTMLButtonElement>('button[aria-label="Rename School"]')!.click();
    render();
    submitName('input[aria-label="Project name"]', 'University');
    expect(names()).toEqual(['University', 'Work', 'Personal']);
  });

  it('deletes a project', () => {
    el<HTMLButtonElement>('button[aria-label="Delete Personal"]')!.click();
    render();

    expect(names()).toEqual(['School', 'Work']);
  });
});
