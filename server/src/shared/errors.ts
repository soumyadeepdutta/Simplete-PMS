export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, message, 'FORBIDDEN');
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, message, 'UNAUTHORIZED');
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, message, 'NOT_FOUND');
}

export function badRequest(message: string): AppError {
  return new AppError(400, message, 'BAD_REQUEST');
}

export function conflict(message: string): AppError {
  return new AppError(409, message, 'CONFLICT');
}
