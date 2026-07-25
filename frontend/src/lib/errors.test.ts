import { describe, it, expect } from 'vitest';
import { getApiErrorMessage } from './errors';

describe('getApiErrorMessage', () => {
  const FALLBACK = 'Something went wrong';

  it('returns the backend message from an axios-shaped error', () => {
    const err = { response: { data: { message: 'Invalid file type' } } };
    expect(getApiErrorMessage(err, FALLBACK)).toBe('Invalid file type');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'boom'],
    ['a number', 42],
    ['a plain Error (network failure)', new Error('Network Error')],
  ])('falls back for %s', (_label, err) => {
    expect(getApiErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    ['response is null', { response: null }],
    ['data is null', { response: { data: null } }],
    ['data has no message', { response: { data: {} } }],
    ['message is not a string', { response: { data: { message: 123 } } }],
    ['message is an empty string', { response: { data: { message: '' } } }],
  ])('falls back when %s', (_label, err) => {
    expect(getApiErrorMessage(err, FALLBACK)).toBe(FALLBACK);
  });
});
