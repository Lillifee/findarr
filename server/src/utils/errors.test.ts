import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  BadRequest,
  Conflict,
  Forbidden,
  HttpError,
  NotFound,
  Unauthorized,
  registerErrorHandler,
} from './errors.js';

describe('errors module', () => {
  describe('HttpError', () => {
    it('should create an error with status code and message', () => {
      const error = new HttpError(404, 'Not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('HttpError');
    });
  });

  describe('error creators', () => {
    it('should create BadRequest error', () => {
      const error = BadRequest('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create Unauthorized error', () => {
      const error = Unauthorized('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should create Forbidden error', () => {
      const error = Forbidden('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('should create NotFound error', () => {
      const error = NotFound('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('should create Conflict error', () => {
      const error = Conflict('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });
  });

  describe('registerErrorHandler', () => {
    it('should handle Zod validation errors with 400 status', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        const schema = z.object({ name: z.string() });
        schema.parse({ name: 123 }); // This will throw ZodError
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid request data');
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('should handle HttpError with custom status code', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw new HttpError(404, 'User not found');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('User not found');
    });

    it('should handle unknown errors with 500 status', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw new Error('Unexpected database error');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unexpected database error');
    });

    it('should handle BadRequest error', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw BadRequest('Invalid query parameter');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid query parameter');
    });

    it('should handle Unauthorized error', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw Unauthorized('Token expired');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Token expired');
    });

    it('should handle Forbidden error', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw Forbidden('Insufficient permissions');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Insufficient permissions');
    });

    it('should handle NotFound error', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw NotFound('Movie not found');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Movie not found');
    });

    it('should handle Conflict error', async () => {
      const app = Fastify();
      registerErrorHandler(app);

      app.get('/test', async () => {
        throw Conflict('Username already taken');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Username already taken');
    });
  });
});
