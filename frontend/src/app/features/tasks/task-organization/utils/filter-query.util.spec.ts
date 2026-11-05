import { convertToParamMap } from '@angular/router';
import { DEFAULT_TASK_FILTERS, type TaskFilters } from '../types/task-organization.types';
import {
  filtersToApiQuery,
  filtersToQueryParams,
  hasActiveFilters,
  isDefaultFilters,
  queryParamsToFilters,
  sameFilters,
} from './filter-query.util';

const ALL: TaskFilters = {
  priority: 'high',
  labelId: 3,
  orderBy: 'title',
  orderDirection: 'desc',
};

describe('filter-query.util', () => {
  describe('queryParamsToFilters', () => {
    it('reads every filter from a Params object', () => {
      expect(
        queryParamsToFilters({ priority: 'high', label: '3', sort: 'title', dir: 'desc' }),
      ).toEqual(ALL);
    });

    it('reads every filter from a ParamMap', () => {
      const params = convertToParamMap({
        priority: 'high',
        label: '3',
        sort: 'title',
        dir: 'desc',
      });
      expect(queryParamsToFilters(params)).toEqual(ALL);
    });

    it('returns the defaults for an empty URL', () => {
      expect(queryParamsToFilters({})).toEqual(DEFAULT_TASK_FILTERS);
    });

    it('ignores values it does not understand', () => {
      expect(
        queryParamsToFilters({ priority: 'urgent', label: 'abc', sort: 'color', dir: 'up' }),
      ).toEqual(DEFAULT_TASK_FILTERS);
    });

    it('rejects label ids that are not positive whole numbers', () => {
      for (const label of ['0', '-3', '1.5', '1e3', ' 3', '99999999999999999999']) {
        expect(queryParamsToFilters({ label }).labelId).toBeNull();
      }
    });

    it('uses the first of repeated values', () => {
      expect(queryParamsToFilters({ priority: ['low', 'high'] }).priority).toBe('low');
      expect(queryParamsToFilters(convertToParamMap({ label: ['5', '3'] })).labelId).toBe(5);
    });

    it('drops a direction given without a sort', () => {
      expect(queryParamsToFilters({ dir: 'desc' }).orderDirection).toBe('asc');
    });

    it('ignores unrelated query params', () => {
      expect(queryParamsToFilters({ tab: 'projects', priority: 'low' })).toEqual({
        ...DEFAULT_TASK_FILTERS,
        priority: 'low',
      });
    });
  });

  describe('filtersToQueryParams', () => {
    it('writes every filter', () => {
      expect(filtersToQueryParams(ALL)).toEqual({
        priority: 'high',
        label: '3',
        sort: 'title',
        dir: 'desc',
      });
    });

    it('sets defaults to null so a merge removes them from the URL', () => {
      expect(filtersToQueryParams(DEFAULT_TASK_FILTERS)).toEqual({
        priority: null,
        label: null,
        sort: null,
        dir: null,
      });
    });

    it('leaves out the ascending direction', () => {
      expect(filtersToQueryParams({ ...ALL, orderDirection: 'asc' })['dir']).toBeNull();
    });

    it('leaves out a direction with no sort', () => {
      expect(
        filtersToQueryParams({ ...DEFAULT_TASK_FILTERS, orderDirection: 'desc' })['dir'],
      ).toBeNull();
    });

    it('round-trips through the URL', () => {
      const cases: TaskFilters[] = [
        ALL,
        DEFAULT_TASK_FILTERS,
        { ...DEFAULT_TASK_FILTERS, labelId: 12 },
        { ...DEFAULT_TASK_FILTERS, orderBy: 'priority' },
      ];
      for (const filters of cases) {
        expect(queryParamsToFilters(filtersToQueryParams(filters))).toEqual(filters);
      }
    });
  });

  describe('filtersToApiQuery', () => {
    it('uses the API parameter names', () => {
      expect(filtersToApiQuery(ALL)).toEqual({
        priority: 'high',
        labelId: '3',
        orderBy: 'title',
        orderDirection: 'desc',
      });
    });

    it('sends nothing for the defaults', () => {
      expect(filtersToApiQuery(DEFAULT_TASK_FILTERS)).toEqual({});
    });

    it('sends the direction only together with a sort', () => {
      expect(filtersToApiQuery({ ...DEFAULT_TASK_FILTERS, orderDirection: 'desc' })).toEqual({});
      expect(filtersToApiQuery({ ...DEFAULT_TASK_FILTERS, orderBy: 'dueDate' })).toEqual({
        orderBy: 'dueDate',
        orderDirection: 'asc',
      });
    });
  });

  describe('hasActiveFilters', () => {
    it('is true when a priority or label narrows the list', () => {
      expect(hasActiveFilters({ ...DEFAULT_TASK_FILTERS, priority: 'low' })).toBe(true);
      expect(hasActiveFilters({ ...DEFAULT_TASK_FILTERS, labelId: 3 })).toBe(true);
    });

    it('is false for ordering alone', () => {
      expect(hasActiveFilters({ ...DEFAULT_TASK_FILTERS, orderBy: 'title' })).toBe(false);
      expect(hasActiveFilters(DEFAULT_TASK_FILTERS)).toBe(false);
    });
  });

  describe('sameFilters and isDefaultFilters', () => {
    it('compares every field', () => {
      expect(sameFilters(ALL, { ...ALL })).toBe(true);
      expect(sameFilters(ALL, { ...ALL, labelId: 4 })).toBe(false);
      expect(sameFilters(ALL, { ...ALL, orderDirection: 'asc' })).toBe(false);
    });

    it('ignores the direction when there is no sort', () => {
      expect(
        sameFilters(DEFAULT_TASK_FILTERS, { ...DEFAULT_TASK_FILTERS, orderDirection: 'desc' }),
      ).toBe(true);
    });

    it('recognises the defaults', () => {
      expect(isDefaultFilters({ ...DEFAULT_TASK_FILTERS })).toBe(true);
      expect(isDefaultFilters(ALL)).toBe(false);
    });
  });
});
