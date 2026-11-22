import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Project } from '../../../shared/types/project.types';
import { ProjectCard } from './project-card';

const CAPSTONE: Project = {
  projectId: 10,
  name: 'Capstone',
  description: 'Final requirements',
  color: '#2563EB',
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const INBOX: Project = {
  ...CAPSTONE,
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
};

describe('ProjectCard', () => {
  let fixture: ComponentFixture<ProjectCard>;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;

  function render(project: Project): void {
    fixture.componentRef.setInput('project', project);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectCard);
    page = fixture.nativeElement;
  });

  it('shows the name, description and color', () => {
    render(CAPSTONE);

    expect(el('.name')?.textContent).toContain('Capstone');
    expect(el('.description')?.textContent).toContain('Final requirements');
    expect(el<HTMLElement>('.swatch')?.style.background).toBe('rgb(37, 99, 235)');
  });

  it('links Edit to the project edit page', () => {
    render(CAPSTONE);

    expect(el('a.edit')?.getAttribute('href')).toBe('/projects/10/edit');
    expect(el('a.edit')?.getAttribute('aria-label')).toBe('Edit Capstone');
  });

  it("links the name to the project's tasks, Inbox included", () => {
    render(CAPSTONE);
    expect(el('a.tasks-link')?.getAttribute('href')).toBe('/projects/10/tasks');

    render(INBOX);
    expect(el('a.tasks-link')?.getAttribute('href')).toBe('/projects/1/tasks');
  });

  it('asks to delete the project when Delete is clicked', () => {
    render(CAPSTONE);
    const requested: Project[] = [];
    fixture.componentInstance.deleteRequested.subscribe((p) => requested.push(p));

    el<HTMLButtonElement>('button.delete')!.click();

    expect(requested).toEqual([CAPSTONE]);
  });

  it('marks the Inbox read-only and offers no edit or delete', () => {
    render(INBOX);

    expect(el('.badge')?.textContent).toContain('Read-only');
    expect(el('a.edit')).toBeNull();
    expect(el('button.delete')).toBeNull();
    expect(el('.actions')).toBeNull();
  });

  it('leaves out an empty description', () => {
    render({ ...CAPSTONE, description: null });

    expect(el('.description')).toBeNull();
  });

  it('marks favorites', () => {
    render({ ...CAPSTONE, isFavorite: true });

    expect(el('[aria-label="Favorite"]')).toBeTruthy();
  });
});
