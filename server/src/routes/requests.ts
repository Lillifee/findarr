import {
  CreateMediaRequestSchema,
  RequestIdSchema,
  UpdateRequestStatusSchema,
} from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import {
  createRequest,
  getUserRequests,
  getAllRequests,
  updateRequestStatus,
  getUserRequestById,
} from '../services/request.js';

const requestRoutes: FastifyPluginAsync = async fastify => {
  // All request routes require authentication
  fastify.addHook('preHandler', fastify.requireAuth);

  // Create a new media request
  fastify.post('/', async request =>
    createRequest(fastify.db, CreateMediaRequestSchema.parse(request.body), request.user?.id)
  );

  // Get user's own requests
  fastify.get('/', async request => getUserRequests(fastify.db, request.user?.id));

  // Get request by ID (owner or admin)
  fastify.get('/:id', async request =>
    getUserRequestById(
      fastify.db,
      RequestIdSchema.parse(request.params).id,
      request.user?.id,
      request.user?.role
    )
  );
};

// Admin request routes
const adminRequestRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  // Get all requests (admin only)
  fastify.get('/', async () => getAllRequests(fastify.db));

  // Update request status (admin only)
  fastify.patch('/:id', async request =>
    updateRequestStatus(
      fastify.db,
      RequestIdSchema.parse(request.params).id,
      UpdateRequestStatusSchema.parse(request.body).status
    )
  );
};

export { requestRoutes, adminRequestRoutes };
