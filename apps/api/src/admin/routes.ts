import { CreateUserSchema, DeleteUserSchema } from '@findarr/shared/auth';
import {
  AdministrationSettingsQuerySchema,
  ArrSettingsQuerySchema,
  LibSettingsQuerySchema,
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

  fastify.get('/administration/settings', async () => fastify.administration.getSettings());
  fastify.put('/administration/settings', async (r) =>
    fastify.administration.saveSettings(AdministrationSettingsQuerySchema.parse(r.body)),
  );

  // Generic settings + test routes for all integrations
  const libServices = { jellyfin: fastify.jellyfin, plex: fastify.plex } as const;
  const arrServices = { radarr: fastify.radarr, sonarr: fastify.sonarr } as const;

  for (const [name, svc] of Object.entries(libServices)) {
    fastify.get(`/${name}/settings`, () => svc.getSettings());
    fastify.put(`/${name}/settings`, async (r) =>
      svc.setSettings(LibSettingsQuerySchema.parse(r.body)),
    );
    fastify.post(`/${name}/test`, async () => svc.testAndSync());
  }

  for (const [name, svc] of Object.entries(arrServices)) {
    fastify.get(`/${name}/settings`, () => svc.getSettings());
    fastify.put(`/${name}/settings`, async (r) =>
      svc.setSettings(ArrSettingsQuerySchema.parse(r.body)),
    );
    fastify.post(`/${name}/test`, async () => svc.testAndSync());
  }

  // Arr-specific: quality profiles and root folders
  for (const [name, svc] of Object.entries(arrServices)) {
    fastify.get(`/${name}/quality-profiles`, async () => svc.listQualityProfiles());
    fastify.get(`/${name}/root-folders`, async () => svc.listRootFolders());
  }

  fastify.get('/tmdb/settings', () => fastify.tmdb.getSettings());
  fastify.put('/tmdb/settings', async (r) =>
    fastify.tmdb.setSettings(TmdbSettingsQuerySchema.parse(r.body)),
  );
  fastify.post('/tmdb/test', async () => fastify.tmdb.testAndSync());
};

export { adminRoutes };
