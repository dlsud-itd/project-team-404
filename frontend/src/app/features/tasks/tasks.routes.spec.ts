import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TASKS_ROUTES } from './tasks.routes';

describe('TASKS_ROUTES', () => {
  it('sends the old new-task address to the project list', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'projects/:projectId/tasks', children: TASKS_ROUTES }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/projects/10/tasks/new');

    expect(TestBed.inject(Router).url).toBe('/projects/10/tasks');
  });
});
