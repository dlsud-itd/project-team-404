import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { asApiTask } from '../../../shared/testing/api-task';
import { apiBoard, boardTask } from '../testing/board-fixtures';
import type { BoardState } from '../types/task-board.types';
import { TaskBoardService, toBoardFilter } from './task-board.service';

const BOARD_URL = `${environment.apiBaseUrl}/api/tasks/board`;
const TASKS_URL = `${environment.apiBaseUrl}/api/tasks`;
const OUTLINE = boardTask(1, 'Outline', { dueDate: '2026-11-30' });

describe('TaskBoardService', () => {
  let service: TaskBoardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskBoardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('toBoardFilter', () => {
    it('drops the list’s sort, which the board refuses', () => {
      expect(
        toBoardFilter({ priorities: ['High'], orderBy: 'dueDate', orderDirection: 'desc' }),
      ).toEqual({ priorities: ['High'] });
    });
  });

  describe('get', () => {
    it('asks for one project’s board', () => {
      service.get(10).subscribe();
      const req = http.expectOne(`${BOARD_URL}?projectId=10`);
      expect(req.request.method).toBe('GET');
      req.flush(apiBoard({}));
    });

    it('sends the Sprint 5 filters but never sort or paging', () => {
      service
        .get(10, {
          status: 'active',
          priorities: ['High', 'Low'],
          labelIds: [3],
          overdue: true,
          recurring: false,
        })
        .subscribe();
      const req = http.expectOne((r) => r.url === BOARD_URL);
      const params = req.request.params;
      expect(params.get('projectId')).toBe('10');
      expect(params.get('status')).toBe('active');
      expect(params.get('priorities')).toBe('High,Low');
      expect(params.get('labelId')).toBe('3');
      expect(params.get('overdue')).toBe('true');
      expect(params.get('recurring')).toBe('false');
      for (const name of ['orderBy', 'orderDirection', 'page', 'pageSize']) {
        expect(params.has(name)).toBe(false);
      }
      req.flush(apiBoard({}));
    });
  });

  describe('load', () => {
    it('merges the board with each task’s details', () => {
      let state: BoardState | undefined;
      service.load(10, { recurring: true }).subscribe((s) => (state = s));

      http
        .expectOne(`${BOARD_URL}?projectId=10&recurring=true`)
        .flush(apiBoard({ todo: [OUTLINE] }));
      http
        .expectOne(`${TASKS_URL}?projectId=10&status=all&pageSize=100&recurring=true&page=1`)
        .flush([asApiTask(OUTLINE)]);

      expect(state?.columns.todo[0].task?.dueDate).toBe('2026-11-30');
    });

    it('still shows the board when the details fail', () => {
      let state: BoardState | undefined;
      service.load(10).subscribe((s) => (state = s));

      http.expectOne(`${BOARD_URL}?projectId=10`).flush(apiBoard({ todo: [OUTLINE] }));
      http
        .expectOne((r) => r.url === TASKS_URL)
        .flush('down', { status: 500, statusText: 'Server Error' });

      expect(state?.columns.todo[0]).toEqual({
        taskId: 1,
        title: 'Outline',
        isDone: false,
        task: null,
      });
    });

    it('fails when the board itself fails', () => {
      let failed = false;
      service.load(10).subscribe({ error: () => (failed = true) });

      http.expectOne((r) => r.url === TASKS_URL).flush([]);
      http
        .expectOne(`${BOARD_URL}?projectId=10`)
        .flush({ error: 'Project not found' }, { status: 404, statusText: 'Not Found' });

      expect(failed).toBe(true);
    });
  });

  describe('reorder', () => {
    it('saves the target column with the API’s status name', () => {
      service.reorder(10, 'inProgress', [4, 1]).subscribe();
      const req = http.expectOne(`${BOARD_URL}/reorder`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        projectId: 10,
        boardStatus: 'in_progress',
        tasks: [4, 1],
      });
      req.flush(req.request.body);
    });
  });
});
