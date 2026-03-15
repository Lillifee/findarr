import {
  CreateUserSchema,
  DeleteUserSchema,
  ArrSettingsBodySchema,
  JellyfinSettingsBodySchema,
} from '@findarr/shared';
import type { FastifyPluginAsync } from 'fastify';
import { createUser, deleteUser, listAllUsers } from '../auth/repository.js';
import { getAllInteractionsEnriched } from '../interaction/service.js';
import {
  getRadarrSettings,
  setRadarrSettings,
  getSonarrSettings,
  setSonarrSettings,
  getJellyfinSettings,
  setJellyfinSettings,
} from '../settings/repository.js';

const adminRoutes: FastifyPluginAsync = async fastify => {
  // All admin routes require admin role
  fastify.addHook('preHandler', fastify.requireAdmin);

  // User management routes
  // List all users
  fastify.get('/users', () => listAllUsers(fastify.db));

  // Create new user
  fastify.post('/users', r => createUser(fastify.db, CreateUserSchema.parse(r.body)));

  // Delete user
  fastify.delete('/users/:id', r =>
    deleteUser(fastify.db, DeleteUserSchema.parse(r.params).id, r.user?.id)
  );

  // Interaction management routes
  // Get all media with interactions (admin only) - enriched with TMDB data
  fastify.get('/interactions', () => getAllInteractionsEnriched(fastify.tmdb, fastify.db));

  // ============================================================================
  // Radarr settings & status
  // ============================================================================

  fastify.get('/radarr/settings', () => getRadarrSettings(fastify.db));

  fastify.put('/radarr/settings', async r => {
    await setRadarrSettings(fastify.db, ArrSettingsBodySchema.parse(r.body));
    return getRadarrSettings(fastify.db);
  });

  fastify.get('/radarr/quality-profiles', () => fastify.arr.getRadarrProfiles());

  fastify.get('/radarr/root-folders', () => fastify.arr.getRadarrRootFolders());

  fastify.post('/radarr/test', async () => {
    const settings = await getRadarrSettings(fastify.db);
    const connected = await fastify.arr.testRadarrConnection();
    return { configured: settings.apiKeySet && !!settings.url, connected, url: settings.url };
  });

  // ============================================================================
  // Sonarr settings & status
  // ============================================================================

  fastify.get('/sonarr/settings', () => getSonarrSettings(fastify.db));

  fastify.put('/sonarr/settings', async r => {
    await setSonarrSettings(fastify.db, ArrSettingsBodySchema.parse(r.body));
    return getSonarrSettings(fastify.db);
  });

  fastify.get('/sonarr/quality-profiles', () => fastify.arr.getSonarrProfiles());

  fastify.get('/sonarr/root-folders', () => fastify.arr.getSonarrRootFolders());

  fastify.post('/sonarr/test', async () => {
    const settings = await getSonarrSettings(fastify.db);
    const connected = await fastify.arr.testSonarrConnection();
    return { configured: settings.apiKeySet && !!settings.url, connected, url: settings.url };
  });

  // ============================================================================
  // Jellyfin settings & status
  // ============================================================================

  fastify.get('/jellyfin/settings', () => getJellyfinSettings(fastify.db));

  fastify.put('/jellyfin/settings', async r => {
    await setJellyfinSettings(fastify.db, JellyfinSettingsBodySchema.parse(r.body));
    return getJellyfinSettings(fastify.db);
  });

  fastify.post('/jellyfin/test', () => fastify.jellyfin.getConnectionInfo());
};

export { adminRoutes };
