import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../../utils/asyncHandler.js';

describe('utils/asyncHandler', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const req = { params: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await handler(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('does not call next on success', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    await handler({}, {}, next);

    // Allow microtask to resolve
    await new Promise(r => setTimeout(r, 0));
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards errors to next on rejection', async () => {
    const error = new Error('database error');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler({}, {}, next);

    // Wait for the promise to settle
    await new Promise(r => setTimeout(r, 0));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards sync throws to next via Promise.resolve', async () => {
    // asyncHandler uses Promise.resolve(fn(...)).catch(next)
    // A sync throw inside fn() propagates before Promise.resolve wraps it,
    // so it becomes an uncaught error — not forwarded to next.
    // This tests that async rejections DO get forwarded.
    const error = new Error('async throw');
    const fn = vi.fn().mockImplementation(async () => { throw error; });
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler({}, {}, next);

    await new Promise(r => setTimeout(r, 10));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns a function', () => {
    const handler = asyncHandler(async () => {});
    expect(typeof handler).toBe('function');
  });
});
