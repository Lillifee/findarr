import {
  ArrSettingsQuerySchema,
  CreateUserSchema,
  DeleteUserSchema,
  JellyfinSettingsQuerySchema,
  TmdbSettingsQuerySchema,
} from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createUser, deleteUser, listAllUsers } from '../auth/repository.js';
import { protectedRoute } from '../utils/routes.js';

const adminRoutes: FastifyPluginAsync = async fastify => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/users', () => listAllUsers(fastify.db));
  fastify.post('/users', r => createUser(fastify.db, CreateUserSchema.parse(r.body)));
  fastify.delete(
    '/users/:id',
    protectedRoute(r => deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user.id))
  );

  fastify.get('/radarr/settings', () => fastify.radarr.getSettings());

  fastify.put('/radarr/settings', r =>
    fastify.radarr.setSettings(ArrSettingsQuerySchema.parse(r.body))
  );

  fastify.get('/radarr/quality-profiles', () => fastify.radarr.listQualityProfiles());

  fastify.get('/radarr/root-folders', () => fastify.radarr.listRootFolders());

  fastify.post('/radarr/test', () => fastify.radarr.testConnection());

  fastify.get('/sonarr/settings', () => fastify.sonarr.getSettings());

  fastify.put('/sonarr/settings', r =>
    fastify.sonarr.setSettings(ArrSettingsQuerySchema.parse(r.body))
  );

  fastify.get('/sonarr/quality-profiles', () => fastify.sonarr.listQualityProfiles());

  fastify.get('/sonarr/root-folders', () => fastify.sonarr.listRootFolders());

  fastify.post('/sonarr/test', () => fastify.sonarr.testConnection());

  fastify.get('/jellyfin/settings', () => fastify.jellyfin.getSettings());

  fastify.put('/jellyfin/settings', r =>
    fastify.jellyfin.setSettings(JellyfinSettingsQuerySchema.parse(r.body))
  );

  fastify.post('/jellyfin/test', () => fastify.jellyfin.testConnection());

  fastify.get('/tmdb/settings', () => fastify.tmdb.getSettings());

  fastify.put('/tmdb/settings', r =>
    fastify.tmdb.setSettings(TmdbSettingsQuerySchema.parse(r.body))
  );

  fastify.post('/tmdb/test', () => fastify.tmdb.testConnection());
};

export { adminRoutes };
