import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { Project } from '../../shared/types/project.types';
import { ProjectList, deletedNotice } from './project-list';
import { apiProject } from '../../testing/helpers/api-project';

const URL = `${environment.apiBaseUrl}/api/projects`;
const base: Project = {
  projectId: 1,
  name: 'Inbox',
  description: null,
  color: null,
  isInbox: true,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
};
const INBOX = base;
const CAPSTONE: Project = {
  ...base,
  projectId: 10,
  name: 'Capstone',
  isInbox: false,
  sortOrder: 1,
};
const GYM: Project = { ...base, projectId: 11, name: 'Gym', isInbox: false, isFavorite: true };
const OLD: Project = {
  ...base,
  projectId: 12,
  name: 'Old class',
  isInbox: false,
  isArchived: true,
};

describe('ProjectList', () => {
  let fixture: ComponentFixture<ProjectList>;
  let http: HttpTestingController;
  let page: HTMLElement;

  const el = <T extends HTMLElement>(selector: string) => page.querySelector(selector) as T | null;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const cardNames = (scope = '') =>
    [...page.querySelectorAll(`${scope} app-project-card .name`)].map((n) =>
      n.childNodes[0].textContent?.trim(),
    );
  const render = () => fixture.detectChanges();

  function loadWith(projects: Project[]): void {
    http.expectOne(URL).flush(projects.map(apiProject));
    render();
  }

  function askToDelete(name: string): void {
    el<HTMLButtonElement>(`button[aria-label="Delete ${name}"]`)!.click();
    render();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectList);
    page = fixture.nativeElement;
    render();
  });

  afterEach(() => http.verify());

  it('shows a loading state until the list arrives', () => {
    expect(text('[role="status"]')).toBe('Loading projects…');

    loadWith([INBOX]);

    expect(el('.status')).toBeNull();
  });

  it('lists the Inbox first, favorites in their own section, and hides archived projects', () => {
    loadWith([CAPSTONE, OLD, GYM, INBOX]);

    expect(cardNames()).toEqual(['Inbox', 'Gym', 'Capstone']);
    expect(cardNames('[aria-labelledby="favorites-heading"]')).toEqual(['Gym']);
    expect(page.textContent).not.toContain('Old class');
  });

  it('links to the new-project page', () => {
    loadWith([INBOX, CAPSTONE]);

    expect(el('.title-row a.new')?.getAttribute('href')).toBe('/projects/new');
  });

  it('invites the user to create a project when only the Inbox exists', () => {
    loadWith([INBOX]);

    expect(text('.empty-title')).toBe('You only have your Inbox so far.');
    expect(el('.empty a')?.getAttribute('href')).toBe('/projects/new');
  });

  it('shows an error with a retry action when the list fails', () => {
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
    render();

    expect(text('.load-error p')).toContain('Something went wrong. Please try again.');

    el<HTMLButtonElement>('button.retry')!.click();
    loadWith([INBOX, CAPSTONE]);

    expect(el('.load-error')).toBeNull();
    expect(cardNames()).toEqual(['Inbox', 'Capstone']);
  });

  describe('deleting', () => {
    beforeEach(() => loadWith([INBOX, CAPSTONE]));

    it('asks for confirmation and makes no request when cancelled', () => {
      askToDelete('Capstone');
      expect(text('#delete-title')).toBe('Delete “Capstone”?');

      el<HTMLButtonElement>('button.cancel')!.click();
      render();

      expect(el('app-confirm-delete-dialog')).toBeNull();
      http.expectNone(`${URL}/10`);
    });

    it('deletes once on 204 No Content, removes the project and shows a notice', () => {
      askToDelete('Capstone');
      el<HTMLButtonElement>('button.confirm')!.click();
      render();

      expect(el<HTMLButtonElement>('button.confirm')!.disabled).toBe(true);
      el<HTMLButtonElement>('button.confirm')!.click();

      const req = http.expectOne(`${URL}/10`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      render();

      expect(el('app-confirm-delete-dialog')).toBeNull();
      expect(text('.form-notice')).toBe('“Capstone” was deleted.');
      expect(cardNames()).toEqual(['Inbox']);
    });

    it('keeps the project and shows the error in the dialog when the delete fails', () => {
      askToDelete('Capstone');
      el<HTMLButtonElement>('button.confirm')!.click();
      http.expectOne(`${URL}/10`).flush(null, { status: 500, statusText: 'Server Error' });
      render();

      expect(text('.dialog [role="alert"]')).toBe('Something went wrong. Please try again.');
      expect(el<HTMLButtonElement>('button.confirm')!.disabled).toBe(false);
      expect(cardNames()).toEqual(['Inbox', 'Capstone']);
    });

    it('closes the dialog and reloads the list when the project is already gone', () => {
      askToDelete('Capstone');
      el<HTMLButtonElement>('button.confirm')!.click();
      http
        .expectOne(`${URL}/10`)
        .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });
      render();

      expect(el('app-confirm-delete-dialog')).toBeNull();
      expect(text('.banner-error')).toBe('Project not found.');
      loadWith([INBOX]);
      expect(cardNames()).toEqual(['Inbox']);
    });
  });
});

describe('deletedNotice', () => {
  it('words the moved-task count', () => {
    expect(deletedNotice('Gym', 0)).toBe('“Gym” was deleted.');
    expect(deletedNotice('Gym', 1)).toBe('“Gym” was deleted. 1 task moved to your Inbox.');
    expect(deletedNotice('Gym', 3)).toBe('“Gym” was deleted. 3 tasks moved to your Inbox.');
  });
});
