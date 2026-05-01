import {
  CreateUserSchema,
  DeleteUserSchema,
  RadarrSettingsQuerySchema,
  SonarrSettingsQuerySchema,
  JellyfinSettingsQuerySchema,
} from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createUser, deleteUser, listAllUsers } from '../auth/repository.js';
import {
  getRadarrSettings,
  setRadarrSettings,
  getSonarrSettings,
  setSonarrSettings,
  getJellyfinSettings,
  setJellyfinSettings,
} from '../integration/repository.js';
import { protectedRoute } from '../utils/routes.js';

const adminRoutes: FastifyPluginAsync = async fastify => {
  // All admin routes require admin role
  fastify.addHook('preHandler', fastify.requireAdmin);

  // User management routes
  // List all users
  fastify.get('/users', () => listAllUsers(fastify.db));

  // Create new user
  fastify.post('/users', r => createUser(fastify.db, CreateUserSchema.parse(r.body)));

  // Delete user
  fastify.delete(
    '/users/:id',
    protectedRoute(r => deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user.id))
  );

  // ============================================================================
  // Radarr settings & status
  // ============================================================================

  fastify.get('/radarr/settings', () => getRadarrSettings(fastify.db));

  fastify.put('/radarr/settings', async r => {
    const body = RadarrSettingsQuerySchema.parse(r.body);
    await setRadarrSettings(fastify.db, body);
    return getRadarrSettings(fastify.db);
  });

  fastify.get('/radarr/quality-profiles', () => fastify.radarr.getProfiles());

  fastify.get('/radarr/root-folders', () => fastify.radarr.getRootFolders());

  fastify.post('/radarr/test', async () => {
    const settings = await getRadarrSettings(fastify.db);
    const connected = await fastify.radarr.testConnection();
    return {
      configured: settings.radarrApiKeySet && !!settings.radarrUrl,
      connected,
      url: settings.radarrUrl,
    };
  });

  // ============================================================================
  // Sonarr settings & status
  // ============================================================================

  fastify.get('/sonarr/settings', () => getSonarrSettings(fastify.db));

  fastify.put('/sonarr/settings', async r => {
    await setSonarrSettings(fastify.db, SonarrSettingsQuerySchema.parse(r.body));
    return getSonarrSettings(fastify.db);
  });

  fastify.get('/sonarr/quality-profiles', () => fastify.sonarr.getProfiles());

  fastify.get('/sonarr/root-folders', () => fastify.sonarr.getRootFolders());

  fastify.post('/sonarr/test', async () => {
    const settings = await getSonarrSettings(fastify.db);
    const connected = await fastify.sonarr.testConnection();
    return {
      configured: settings.sonarrApiKeySet && !!settings.sonarrUrl,
      connected,
      url: settings.sonarrUrl,
    };
  });

  // ============================================================================
  // Jellyfin settings & status
  // ============================================================================

  fastify.get('/jellyfin/settings', () => getJellyfinSettings(fastify.db));

  fastify.put('/jellyfin/settings', async r => {
    await setJellyfinSettings(fastify.db, JellyfinSettingsQuerySchema.parse(r.body));
    return getJellyfinSettings(fastify.db);
  });

  fastify.post('/jellyfin/test', () => fastify.jellyfin.getConnectionInfo());
};

export { adminRoutes };
