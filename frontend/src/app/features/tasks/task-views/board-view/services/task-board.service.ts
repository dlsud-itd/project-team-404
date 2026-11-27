import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import type { Task } from '../../../shared/types/task.types';
import {
  TaskService,
  appendTaskFilters,
  type TaskListFilter,
} from '../../../task-crud/services/task.service';
import type {
  ApiTaskBoard,
  BoardColumnKey,
  BoardFilter,
  BoardReorderBody,
  BoardState,
} from '../types/task-board.types';
import { toApiStatus, toBoardState } from '../utils/board-move.util';

/** The board's filters from the list's: the same, minus sort and paging. */
export function toBoardFilter(filter: Omit<TaskListFilter, 'projectId' | 'page'>): BoardFilter {
  const board: BoardFilter & Pick<TaskListFilter, 'orderBy' | 'orderDirection'> = { ...filter };
  delete board.orderBy;
  delete board.orderDirection;
  return board;
}

/**
 * GET /api/tasks/board and PUT /api/tasks/board/reorder. The board only sends ids, titles and
 * columns, so `load` also fetches the tasks' details (priority, labels, dates) to show on cards.
 */
@Injectable({ providedIn: 'root' })
export class TaskBoardService {
  private readonly http = inject(HttpClient);
  private readonly tasks = inject(TaskService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tasks/board`;

  /** One project's board, or every active project's when `projectId` is null. */
  get(projectId: number | null, filter: BoardFilter = {}): Observable<ApiTaskBoard> {
    let params = new HttpParams();
    if (projectId !== null) params = params.set('projectId', projectId);
    if (filter.status && filter.status !== 'all') params = params.set('status', filter.status);
    params = appendTaskFilters(params, filter);
    return this.http.get<ApiTaskBoard>(this.baseUrl, { params });
  }

  /**
   * The board with each card's details. Cards whose details fail to load still show their
   * title, so a failed details request never hides the board.
   */
  load(projectId: number | null, filter: BoardFilter = {}): Observable<BoardState> {
    const details = this.tasks
      .listAll(projectId === null ? { ...filter } : { ...filter, projectId })
      .pipe(catchError(() => of<Task[]>([])));
    return forkJoin([this.get(projectId, filter), details]).pipe(
      map(([board, tasks]) => toBoardState(board, tasks)),
    );
  }

  /** Saves a column's full order after a move; a task from another column moves into it. */
  reorder(
    projectId: number,
    column: BoardColumnKey,
    taskIds: number[],
  ): Observable<BoardReorderBody> {
    const body: BoardReorderBody = { projectId, boardStatus: toApiStatus(column), tasks: taskIds };
    return this.http.put<BoardReorderBody>(`${this.baseUrl}/reorder`, body);
  }
}
