// Errors thrown by services/controllers. The error handler turns them into JSON responses:
// { error: { code, message, details? } }
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHENTICATED', message = 'Please sign in.') =>
  new AppError(401, code, message);
export const forbidden = (message = 'You do not have permission to do this.') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFoundError = (message = 'Not found.') => new AppError(404, 'NOT_FOUND', message);
export const conflict = (code, message) => new AppError(409, code, message);
export const tooManyRequests = (message) => new AppError(429, 'TOO_MANY_REQUESTS', message);
