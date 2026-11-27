import type { TableSort } from '../types/task-view.types';
import {
  TABLE_COLUMNS,
  columnAriaSort,
  nextTableSort,
  sortButtonLabel,
} from './table-columns.util';

const column = (key: string) => TABLE_COLUMNS.find((c) => c.key === key)!;
const DEFAULT: TableSort = { orderBy: null, orderDirection: 'asc' };

describe('table columns', () => {
  it('lists the columns in order, sorting only by fields the API orders by', () => {
    expect(TABLE_COLUMNS.map((c) => [c.label, c.sortField])).toEqual([
      ['Title', 'title'],
      ['Project', null],
      ['Priority', 'priority'],
      ['Labels', null],
      ['Scheduled', 'scheduledDate'],
      ['Due', 'dueDate'],
      ['Deadline', 'deadline'],
      ['Recurrence', null],
      ['Streak', null],
      ['Status', null],
    ]);
  });

  describe('nextTableSort', () => {
    it('sorts a new field ascending', () => {
      expect(nextTableSort(DEFAULT, 'dueDate')).toEqual({
        orderBy: 'dueDate',
        orderDirection: 'asc',
      });
      expect(nextTableSort({ orderBy: 'title', orderDirection: 'desc' }, 'dueDate')).toEqual({
        orderBy: 'dueDate',
        orderDirection: 'asc',
      });
    });

    it('flips the same field to descending, then back to the default order', () => {
      const desc = nextTableSort({ orderBy: 'dueDate', orderDirection: 'asc' }, 'dueDate');
      expect(desc).toEqual({ orderBy: 'dueDate', orderDirection: 'desc' });
      expect(nextTableSort(desc, 'dueDate')).toEqual(DEFAULT);
    });
  });

  describe('columnAriaSort', () => {
    it('is null for a column that cannot sort', () => {
      expect(columnAriaSort(column('labels'), DEFAULT)).toBeNull();
    });

    it('says which way the sorted column goes and none for the rest', () => {
      const sort: TableSort = { orderBy: 'deadline', orderDirection: 'desc' };
      expect(columnAriaSort(column('deadline'), sort)).toBe('descending');
      expect(columnAriaSort(column('title'), sort)).toBe('none');
      expect(columnAriaSort(column('title'), { orderBy: 'title', orderDirection: 'asc' })).toBe(
        'ascending',
      );
    });
  });

  it('describes what the next click does', () => {
    expect(sortButtonLabel(column('due'), DEFAULT)).toBe('Sort by Due, ascending');
    expect(sortButtonLabel(column('due'), { orderBy: 'dueDate', orderDirection: 'asc' })).toBe(
      'Sort by Due, descending',
    );
    expect(sortButtonLabel(column('due'), { orderBy: 'dueDate', orderDirection: 'desc' })).toBe(
      'Sort by Due: back to default order',
    );
  });
});
