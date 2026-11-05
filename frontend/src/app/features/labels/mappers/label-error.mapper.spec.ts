import { HttpErrorResponse } from '@angular/common/http';
import { mapLabelError } from './label-error.mapper';

const httpError = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error, statusText: 'Error' });

describe('mapLabelError', () => {
  it('puts a 409 on the name field', () => {
    expect(
      mapLabelError(
        httpError(409, {
          code: 'label-name-taken',
          error: 'A label with this name already exists',
        }),
      ),
    ).toEqual({
      message: 'You already have a label with this name.',
      field: 'name',
      notFound: false,
    });
  });

  it('reads the rejected field from a 400 details list', () => {
    const name = httpError(400, {
      error: 'Invalid label details',
      details: [{ field: 'name', message: 'Too big' }],
    });
    const color = httpError(400, {
      error: 'Invalid label details',
      details: [{ field: 'color', message: 'Invalid' }],
    });

    expect(mapLabelError(name)).toEqual({
      message: 'Use a name of 1 to 50 characters.',
      field: 'name',
      notFound: false,
    });
    expect(mapLabelError(color)).toEqual({
      message: 'Pick one of the colors shown.',
      field: 'color',
      notFound: false,
    });
  });

  it('gives a general message for a 400 without a known field', () => {
    for (const body of [null, { error: 'Invalid label update' }, { details: [{ field: '' }] }]) {
      expect(mapLabelError(httpError(400, body))).toEqual({
        message: 'Check the label details and try again.',
        notFound: false,
      });
    }
  });

  it('marks a 404 as not found', () => {
    expect(mapLabelError(httpError(404, { error: 'Label not found' }))).toEqual({
      message: 'Label not found.',
      notFound: true,
    });
  });

  it('explains an ended session', () => {
    expect(mapLabelError(httpError(401)).message).toBe(
      'Your session has ended. Please log in again.',
    );
  });

  it('gives a generic message for server errors and non-HTTP errors', () => {
    const generic = { message: 'Something went wrong. Please try again.', notFound: false };
    expect(mapLabelError(httpError(500))).toEqual(generic);
    expect(mapLabelError(httpError(0))).toEqual(generic);
    expect(mapLabelError(new Error('boom'))).toEqual(generic);
  });
});
