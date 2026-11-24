import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { apiTimeline } from '../testing/timeline-fixtures';
import type { ApiTimeline, TimelineRequest } from '../types/task-timeline.types';
import { TaskTimelineService } from './task-timeline.service';

const URL = `${environment.apiBaseUrl}/api/tasks/timeline`;
const WEEK = { from: '2026-11-23', to: '2026-11-29' };
const ALL: TimelineRequest = { projectId: null, includeCompleted: false, filter: {} };

describe('TaskTimelineService', () => {
  let service: TaskTimelineService;
  let http: HttpTestingController;

  /** Makes a request and returns its query string as key/value pairs. */
  function paramsOf(request: TimelineRequest): Record<string, string> {
    service.get(WEEK, request).subscribe();
    const call = http.expectOne((r) => r.url === URL);
    expect(call.request.method).toBe('GET');
    const params = call.request.params;
    const result = Object.fromEntries(params.keys().map((key) => [key, params.get(key)!]));
    call.flush(apiTimeline(WEEK.from, WEEK.to, []));
    return result;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskTimelineService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the window only, by default', () => {
    expect(paramsOf(ALL)).toEqual({ from: '2026-11-23', to: '2026-11-29' });
  });

  it('adds the project and completed tasks when asked', () => {
    expect(paramsOf({ ...ALL, projectId: 18, includeCompleted: true })).toEqual({
      from: '2026-11-23',
      to: '2026-11-29',
      projectId: '18',
      includeCompleted: 'true',
    });
  });

  it('sends the Sprint 5 filters like the board does', () => {
    expect(
      paramsOf({
        ...ALL,
        filter: { status: 'active', priorities: ['high'], labelIds: [3, 4], recurring: true },
      }),
    ).toEqual({
      from: '2026-11-23',
      to: '2026-11-29',
      status: 'active',
      priority: 'high',
      labelIds: '3,4',
      recurring: 'true',
    });
  });

  it('includes completed tasks when the filter asks for only completed ones', () => {
    expect(paramsOf({ ...ALL, filter: { status: 'completed' } })).toEqual({
      from: '2026-11-23',
      to: '2026-11-29',
      includeCompleted: 'true',
      status: 'completed',
    });
  });

  it('returns the body as sent', () => {
    const body = apiTimeline(WEEK.from, WEEK.to, [], 2);
    let result: ApiTimeline | undefined;
    service.get(WEEK, ALL).subscribe((value) => (result = value));
    http.expectOne((r) => r.url === URL).flush(body);
    expect(result).toEqual(body);
  });
});
