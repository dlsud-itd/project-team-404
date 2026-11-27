import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjectsStore } from '../../state/projects.store';
import type { Project } from '../../types/project.types';
import { ProjectsHeader } from './projects-header';

const project = (projectId: number, changes: Partial<Project> = {}): Project => ({
  projectId,
  name: `Project ${projectId}`,
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: projectId,
  ...changes,
});

/** The Inbox plus `count` active projects, and one archived project that doesn't count. */
const projects = (count: number): Project[] => [
  project(1, { isInbox: true, name: 'Inbox' }),
  ...Array.from({ length: count }, (_, index) => project(index + 2)),
  project(99, { isArchived: true }),
];

describe('ProjectsHeader', () => {
  let fixture: ComponentFixture<ProjectsHeader>;
  let store: ProjectsStore;

  const button = () => fixture.nativeElement.querySelector('button.new') as HTMLButtonElement;
  const hint = () =>
    (fixture.nativeElement.querySelector('#project-limit-hint') as HTMLElement | null)?.textContent
      ?.replace(/\s+/g, ' ')
      .trim();

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProjectsHeader],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ProjectsStore);
    fixture = TestBed.createComponent(ProjectsHeader);
  });

  it('shows no count until the projects have loaded, and leaves the button usable', () => {
    fixture.detectChanges();
    expect(hint()).toBeUndefined();
    expect(button().disabled).toBe(false);
  });

  it('counts active projects, not the Inbox or archived ones, and allows a tenth', () => {
    store.setProjects(projects(9));
    fixture.detectChanges();

    expect(hint()).toBe('9 of 10 projects');
    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-describedby')).toBe('project-limit-hint');
  });

  it('disables + New project at 10 and says how to make room', () => {
    store.setProjects(projects(10));
    fixture.detectChanges();

    expect(hint()).toBe('10 of 10 projects · archive one to add another');
    expect(button().disabled).toBe(true);
  });
});
