/**
 * Wraps async route handlers to catch errors and forward to Express error handler.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
