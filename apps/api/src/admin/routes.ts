import { CreateUserSchema, DeleteUserSchema } from '@findarr/shared/auth';
import {
  ArrSettingsQuerySchema,
  JellyfinSettingsQuerySchema,
  PlexSettingsQuerySchema,
  TmdbSettingsQuerySchema,
} from '@findarr/shared/settings';
import type { FastifyInstance } from 'fastify';

import { createUser, deleteUser, listAllUsers } from '../auth/repository.js';
import { protectedRoute } from '../utils/routes.js';

const adminRoutes = (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', fastify.requireAdmin);

  fastify.get('/users', () => listAllUsers(fastify.db));
  fastify.post('/users', async (r) => createUser(fastify.db, CreateUserSchema.parse(r.body)));
  fastify.delete(
    '/users/:id',
    protectedRoute(async (r) =>
      deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user.id),
    ),
  );

  fastify.get('/radarr/settings', () => fastify.radarr.getSettings());

  fastify.put('/radarr/settings', async (r) =>
    fastify.radarr.setSettings(ArrSettingsQuerySchema.parse(r.body)),
  );

  fastify.get('/radarr/quality-profiles', async () => fastify.radarr.listQualityProfiles());

  fastify.get('/radarr/root-folders', async () => fastify.radarr.listRootFolders());

  fastify.post('/radarr/test', async () => fastify.radarr.testAndSync());

  fastify.get('/sonarr/settings', () => fastify.sonarr.getSettings());

  fastify.put('/sonarr/settings', async (r) =>
    fastify.sonarr.setSettings(ArrSettingsQuerySchema.parse(r.body)),
  );

  fastify.get('/sonarr/quality-profiles', async () => fastify.sonarr.listQualityProfiles());

  fastify.get('/sonarr/root-folders', async () => fastify.sonarr.listRootFolders());

  fastify.post('/sonarr/test', async () => fastify.sonarr.testAndSync());

  fastify.get('/jellyfin/settings', () => fastify.jellyfin.getSettings());

  fastify.put('/jellyfin/settings', async (r) =>
    fastify.jellyfin.setSettings(JellyfinSettingsQuerySchema.parse(r.body)),
  );

  fastify.post('/jellyfin/test', async () => fastify.jellyfin.testAndSync());

  fastify.get('/plex/settings', () => fastify.plex.getSettings());

  fastify.put('/plex/settings', async (r) =>
    fastify.plex.setSettings(PlexSettingsQuerySchema.parse(r.body)),
  );

  fastify.post('/plex/test', async () => fastify.plex.testAndSync());

  fastify.get('/tmdb/settings', () => fastify.tmdb.getSettings());

  fastify.put('/tmdb/settings', async (r) =>
    fastify.tmdb.setSettings(TmdbSettingsQuerySchema.parse(r.body)),
  );

  fastify.post('/tmdb/test', async () => fastify.tmdb.testAndSync());
};

export { adminRoutes };
