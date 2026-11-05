import { TestBed } from '@angular/core/testing';
import { ERRANDS, STUDY, URGENT } from '../testing/helpers/api-label';
import { LabelsStore } from './labels.store';

describe('LabelsStore', () => {
  let store: LabelsStore;

  beforeEach(() => {
    store = TestBed.inject(LabelsStore);
  });

  it('starts empty and not loaded', () => {
    expect(store.labels()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('lists labels alphabetically, ignoring case', () => {
    store.setLabels([URGENT, STUDY, ERRANDS]);

    expect(store.labels().map((l) => l.name)).toEqual(['errands', 'Study', 'Urgent']);
  });

  it('breaks name ties by id', () => {
    store.setLabels([
      { labelId: 9, name: 'work', color: null },
      { labelId: 2, name: 'Work', color: null },
    ]);

    expect(store.labels().map((l) => l.labelId)).toEqual([2, 9]);
  });

  it('tracks a load from start to success', () => {
    store.startLoading();
    expect(store.loading()).toBe(true);

    store.setLabels([STUDY]);
    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(true);
  });

  it('records a failed load and clears it on the next attempt', () => {
    store.startLoading();
    store.fail('Something went wrong.');
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe('Something went wrong.');

    store.startLoading();
    expect(store.error()).toBeNull();
  });

  it('finds a label by id', () => {
    store.setLabels([STUDY, ERRANDS]);

    expect(store.byId(5)).toEqual(ERRANDS);
    expect(store.byId(99)).toBeUndefined();
  });

  it('adds a new label and replaces an existing one', () => {
    store.setLabels([STUDY]);

    store.upsert(ERRANDS);
    store.upsert({ ...STUDY, name: 'Reading' });

    expect(store.labels()).toEqual([ERRANDS, { ...STUDY, name: 'Reading' }]);
  });

  it('removes a label', () => {
    store.setLabels([STUDY, ERRANDS]);

    store.remove(3);

    expect(store.labels()).toEqual([ERRANDS]);
  });

  it('forgets everything on reset', () => {
    store.setLabels([STUDY]);
    store.fail('x');

    store.reset();

    expect(store.labels()).toEqual([]);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBeNull();
  });
});
