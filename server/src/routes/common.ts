import { getErrorMessage } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';

/**
 * Register global error handler for the Fastify instance
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      request.log.warn({ err: error }, 'Validation error');
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
      request.log.error({ err: error }, message);
    } else {
      request.log.warn({ err: error }, message);
    }

    // Send response
    return reply.status(statusCode).send({
      error: message,
    });
  });
}
