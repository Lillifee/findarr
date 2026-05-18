import { getErrorMessage } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

/**
 * Custom error class that includes HTTP status code
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Pre-defined error creators for common cases
 */
export const BadRequest = (message?: string) => new HttpError(400, message);
export const Unauthorized = (message?: string) => new HttpError(401, message);
export const Forbidden = (message?: string) => new HttpError(403, message);
export const NotFound = (message?: string) => new HttpError(404, message);
export const Conflict = (message?: string) => new HttpError(409, message);

/**
 * Register global error handler for the Fastify instance
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      request.log.warn({ name: 'request', err: error }, 'Validation error');
      return reply.status(400).send({
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    // Determine status code for other errors
    const statusCode = error instanceof HttpError ? error.statusCode : 500;

    // Get error message
    const message = getErrorMessage(error);

    // Log error (500s are unexpected, so log with higher severity)
    if (statusCode >= 500) {
      request.log.error({ name: 'request', err: error }, message);
    } else {
      request.log.warn({ name: 'request', err: error }, message);
    }

    // Send response
    return reply.status(statusCode).send({
      error: message,
    });
  });
}
