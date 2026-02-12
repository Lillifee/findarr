/**
 * Custom error class that includes HTTP status code
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Pre-defined error creators for common cases
 */
export const BadRequest = (message: string) => new HttpError(400, message);
export const Unauthorized = (message: string) => new HttpError(401, message);
export const Forbidden = (message: string) => new HttpError(403, message);
export const NotFound = (message: string) => new HttpError(404, message);
export const Conflict = (message: string) => new HttpError(409, message);
