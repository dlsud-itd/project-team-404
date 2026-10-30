import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../../environments/environment';
import type { Project } from '../../shared/types/project.types';
import { ProjectForm } from './project-form';
import { apiProject } from '../../testing/helpers/api-project';

@Component({ template: '' })
class Blank {}

const URL = `${environment.apiBaseUrl}/api/projects`;
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

describe('ProjectForm', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let router: Router;

  const page = () => harness.routeNativeElement as HTMLElement;
  const el = <T extends HTMLElement>(selector: string) => page().querySelector(selector) as T;
  const text = (selector: string) => el(selector)?.textContent?.trim() ?? '';
  const messageFor = (id: string) => text(`#${id}-status`);
  const saveButton = () => el<HTMLButtonElement>('button[type="submit"]');

  function type(id: string, value: string): void {
    const input = el<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    harness.detectChanges();
  }

  function submit(): void {
    el<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  function pickColor(value: string): void {
    el<HTMLInputElement>(`input[data-color="${value}"]`).click();
    harness.detectChanges();
  }

  function fail(url: string, status: number, error: string | null = null): void {
    http.expectOne(url).flush(error ? { error } : null, { status, statusText: 'Error' });
    harness.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'projects', component: Blank },
          { path: 'projects/new', component: ProjectForm, data: { mode: 'create' } },
          { path: 'projects/:projectId/edit', component: ProjectForm, data: { mode: 'edit' } },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  describe('create mode', () => {
    beforeEach(async () => {
      await harness.navigateByUrl('/projects/new');
    });

    it('shows labelled name and description fields, a color picker and a submit button', () => {
      expect(text('h1')).toBe('New project');
      for (const id of ['project-name', 'project-description']) {
        expect(el(`#${id}`)).toBeTruthy();
        expect(el(`label[for="${id}"]`)).toBeTruthy();
      }
      // "No color" plus the nine preset colors.
      expect(page().querySelectorAll('input[type="radio"]')).toHaveLength(10);
      expect(text('legend')).toContain('Color');
      expect(saveButton().textContent).toContain('Create project');
    });

    it('requires a name and makes no request when submitted empty', () => {
      submit();

      expect(messageFor('project-name')).toBe('Project name is required.');
      http.expectNone(URL);
    });

    it('shows length errors while typing and blocks the submit', () => {
      type('project-name', 'a'.repeat(151));
      type('project-description', 'b'.repeat(501));

      expect(messageFor('project-name')).toBe('Use 150 characters or fewer.');
      expect(messageFor('project-description')).toBe('Use 500 characters or fewer.');
      expect(text('.count')).toBe('501/500');

      submit();
      http.expectNone(URL);
    });

    it('sends a trimmed name with empty optional fields as null', () => {
      type('project-name', '  Capstone  ');
      submit();

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Capstone', description: null, color: null });
      req.flush(apiProject(CAPSTONE));
    });

    it('sends the chosen description and color', () => {
      type('project-name', 'Capstone');
      type('project-description', 'Final requirements');
      pickColor('#2563EB');
      submit();

      expect(http.expectOne(URL).request.body).toEqual({
        name: 'Capstone',
        description: 'Final requirements',
        color: '#2563EB',
      });
    });

    it('disables the button while saving and ignores a second submit', () => {
      type('project-name', 'Capstone');
      submit();
      submit();

      expect(saveButton().disabled).toBe(true);
      expect(saveButton().textContent).toContain('Creating…');
      http.expectOne(URL).flush(apiProject(CAPSTONE));
    });

    it('goes back to the project list after creating', async () => {
      type('project-name', 'Capstone');
      submit();
      http.expectOne(URL).flush(apiProject(CAPSTONE));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/projects');
    });

    it('shows a 400 on the field it names and keeps the input', () => {
      type('project-name', 'Capstone');
      submit();
      fail(URL, 400, 'Project name is required');

      expect(messageFor('project-name')).toBe('Project name is required');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone');
      expect(saveButton().disabled).toBe(false);

      type('project-name', 'Capstone 2');
      expect(messageFor('project-name')).toBe('');
    });

    it('shows a generic error on a server failure so the user can retry', () => {
      type('project-name', 'Capstone');
      submit();
      fail(URL, 500);

      expect(text('.form-error')).toBe('Something went wrong. Please try again.');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone');

      submit();
      http.expectOne(URL).flush(apiProject(CAPSTONE));
    });

    it('closes with Escape without saving', async () => {
      type('project-name', 'Capstone');
      el('form').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await harness.fixture.whenStable();

      expect(router.url).toBe('/projects');
      http.expectNone(URL);
    });
  });

  describe('edit mode', () => {
    async function open(project: Project = CAPSTONE): Promise<void> {
      await harness.navigateByUrl(`/projects/${project.projectId}/edit`);
      expect(text('[role="status"]')).toBe('Loading project…');
      http.expectOne(`${URL}/${project.projectId}`).flush(apiProject(project));
      harness.detectChanges();
    }

    it('fills the form with the current values', async () => {
      await open();

      expect(text('h1')).toBe('Edit project');
      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone');
      expect(el<HTMLTextAreaElement>('#project-description').value).toBe('Final requirements');
      expect(el<HTMLInputElement>('input[data-color="#2563EB"]').checked).toBe(true);
    });

    it('keeps Save off until something changes', async () => {
      await open();
      expect(saveButton().disabled).toBe(true);

      type('project-name', 'Capstone 2');
      expect(saveButton().disabled).toBe(false);

      type('project-name', 'Capstone');
      expect(saveButton().disabled).toBe(true);
    });

    it('sends only the changed fields and confirms the save', async () => {
      await open();
      type('project-name', 'Capstone 2');
      submit();

      const req = http.expectOne(`${URL}/10`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Capstone 2' });
      req.flush({ projectId: 10, message: 'Project updated successfully' });
      harness.detectChanges();

      expect(text('.form-notice')).toBe('Changes saved.');
      expect(saveButton().disabled).toBe(true);
    });

    it('sends null to clear the description and remove the color', async () => {
      await open();
      type('project-description', '');
      pickColor('');
      submit();

      expect(http.expectOne(`${URL}/10`).request.body).toEqual({ description: null, color: null });
    });

    it('shows a 400 on the description field', async () => {
      await open();
      type('project-description', 'New text');
      submit();
      fail(`${URL}/10`, 400, 'Description must be at most 500 characters');

      expect(messageFor('project-description')).toBe('Description must be at most 500 characters');
      expect(el<HTMLTextAreaElement>('#project-description').value).toBe('New text');
    });

    it('shows "Project not found" and refreshes the list when the save returns 404', async () => {
      await open();
      type('project-name', 'Capstone 2');
      submit();
      fail(`${URL}/10`, 404, 'Invalid updating project.');

      expect(text('.form-error')).toBe('Project not found.');
      http.expectOne(URL).flush([]);
    });

    it('shows "Project not found" when the project cannot be loaded', async () => {
      await harness.navigateByUrl('/projects/99/edit');
      fail(`${URL}/99`, 404, 'Project not found');

      expect(text('.message p')).toBe('Project not found.');
      expect(el('form')).toBeNull();
    });

    it('treats a non-numeric id as not found without a request', async () => {
      await harness.navigateByUrl('/projects/abc/edit');

      expect(text('.message p')).toBe('Project not found.');
    });

    it('offers a retry when loading fails', async () => {
      await harness.navigateByUrl('/projects/10/edit');
      fail(`${URL}/10`, 500);

      el<HTMLButtonElement>('.message button').click();
      http.expectOne(`${URL}/10`).flush(apiProject(CAPSTONE));
      harness.detectChanges();

      expect(el<HTMLInputElement>('#project-name').value).toBe('Capstone');
    });

    it('does not let the Inbox be edited', async () => {
      await open({ ...CAPSTONE, projectId: 1, name: 'Inbox', isInbox: true });

      expect(text('.message p')).toContain('Inbox is read-only');
      expect(el('form')).toBeNull();
    });
  });
});
