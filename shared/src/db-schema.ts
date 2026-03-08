import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Users Table
// ============================================================================

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('passwordHash').notNull(),
    displayName: text('displayName').notNull(),
    role: text('role', { enum: ['user', 'admin'] }).notNull(),
    createdAt: integer('createdAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
  },
  table => [index('idx_users_email').on(table.email)]
);

// ============================================================================
// Media Table
// ============================================================================

export const media = sqliteTable(
  'media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdbId').notNull(),
    mediaType: text('mediaType', { enum: ['movie', 'tv'] }).notNull(),
    jellyfinId: text('jellyfinId'),
    status: text('status', { enum: ['pending', 'requested', 'available'] })
      .notNull()
      .default('pending'),
    createdAt: integer('createdAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
    updatedAt: integer('updatedAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
  },
  table => [
    index('idx_media_tmdb').on(table.tmdbId, table.mediaType),
    index('idx_media_status').on(table.status),
    index('idx_media_jellyfin').on(table.jellyfinId),
    unique('media_tmdbId_mediaType_unique').on(table.tmdbId, table.mediaType),
  ]
);

// ============================================================================
// User Media Interactions Table
// ============================================================================

export const userMediaInteractions = sqliteTable(
  'user_media_interactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaId: integer('mediaId')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action', { enum: ['liked', 'disliked'] }).notNull(),
    createdAt: integer('createdAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
  },
  table => [
    index('idx_user_media_interactions_user').on(table.userId, table.action),
    index('idx_user_media_interactions_media').on(table.mediaId, table.action),
    unique('user_media_interactions_mediaId_userId_action_unique').on(
      table.mediaId,
      table.userId,
      table.action
    ),
  ]
);

// ============================================================================
// Relations
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  interactions: many(userMediaInteractions),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  interactions: many(userMediaInteractions),
}));

export const userMediaInteractionsRelations = relations(userMediaInteractions, ({ one }) => ({
  media: one(media, {
    fields: [userMediaInteractions.mediaId],
    references: [media.id],
  }),
  user: one(users, {
    fields: [userMediaInteractions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Schema Export
// ============================================================================

export const schema = {
  users,
  media,
  userMediaInteractions,
};

export const relationsSchema = {
  usersRelations,
  mediaRelations,
  userMediaInteractionsRelations,
};
