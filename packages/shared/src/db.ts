import { relations, sql, type InferSelectModel } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  index,
  unique,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

import type { RegionGroupId } from './constants.js';

// Status progression: none (not in Sonarr) -> requested (user wants it) -> monitored (in Sonarr) -> downloaded (complete) -> available (in Jellyfin)
export type SeasonRecord = {
  seasonNumber: number;
  status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
};

// ============================================================================
// Settings Table
// ============================================================================

export const appSettings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

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
  (table) => [index('idx_users_email').on(table.email)],
);

// ============================================================================
// Media Table
// ============================================================================

export const media = sqliteTable(
  'media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['movie', 'tv'] }).notNull(),
    // TMDB ID - canonical identifier for both movies and TV
    tmdbId: integer('tmdbId'),
    // TVDB ID - only for TV shows, used for Sonarr sync
    tvdbId: integer('tvdbId'),
    arrId: integer('arrId'),
    arrUrl: text('arrUrl'),
    jellyfinId: text('jellyfinId'),
    jellyfinAddedAt: integer('jellyfinAddedAt').$type<number | null>(),
    status: text('status', {
      enum: ['pending', 'requested', 'downloading', 'downloaded', 'available', 'warning'],
    })
      .notNull()
      .default('pending'),
    // TV only: season tracking synced from Sonarr/Jellyfin (none=not in Sonarr, requested=user wants it, monitored=in Sonarr, downloaded=complete in Sonarr, available=in Jellyfin)
    seasons: text('seasons', { mode: 'json' }).$type<SeasonRecord[] | null>(),
    createdAt: integer('createdAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
    updatedAt: integer('updatedAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
  },
  (table) => [
    index('idx_media_tvdb').on(table.tvdbId),
    index('idx_media_tmdb').on(table.tmdbId, table.type),
    index('idx_media_arr').on(table.arrId),
    index('idx_media_status').on(table.status),
    index('idx_media_jellyfin').on(table.jellyfinId),
    // Unique constraints:
    // - tmdbId + type: Canonical TMDB identifier (NULL allowed for TV before enrichment)
    // - tvdbId + type: TV show sync identifier (allows efficient batch upsert from Sonarr)
    unique('media_tmdbId_type_unique').on(table.tmdbId, table.type),
    unique('media_tvdbId_type_unique').on(table.tvdbId, table.type),
  ],
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
  (table) => [
    index('idx_user_media_interactions_user').on(table.userId, table.action),
    index('idx_user_media_interactions_media').on(table.mediaId, table.action),
    unique('user_media_interactions_mediaId_userId_action_unique').on(
      table.mediaId,
      table.userId,
      table.action,
    ),
  ],
);

// ============================================================================
// User Genre Preferences Table
// ============================================================================

export const userGenrePreferences = sqliteTable(
  'user_genre_preferences',
  {
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    genreId: integer('genreId').notNull(),
    genreName: text('genreName').notNull(),
    score: integer('score').notNull().default(0),
    count: integer('count').notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.genreId] }),
    index('idx_user_genre_preferences_user').on(table.userId),
  ],
);

// ============================================================================
// Catalog Cache Table
// ============================================================================

export const catalogCache = sqliteTable(
  'catalog_cache',
  {
    tmdbId: integer('tmdbId').notNull(),
    type: text('type', { enum: ['movie', 'tv'] }).notNull(),
    name: text('name').notNull(),
    date: text('date'),
    posterPath: text('posterPath'),
    backdropPath: text('backdropPath'),
    overview: text('overview'),
    voteAverage: integer('voteAverage').notNull(),
    voteCount: integer('voteCount').notNull(),
    popularity: integer('popularity').notNull(),
    originalLanguage: text('originalLanguage').notNull(),
    originCountry: text('originCountry'),
    genres: text('genres').notNull(),
    keywords: text('keywords'),
    trendingRank: integer('trendingRank'),
  },
  (table) => [primaryKey({ columns: [table.tmdbId, table.type] })],
);

// ============================================================================
// Media Stats Table
// ============================================================================

export const mediaStats = sqliteTable('media_stats', {
  mediaType: text('mediaType', { enum: ['movie', 'tv'] }).primaryKey(),
  maxPopularity: integer('maxPopularity').notNull(),
  maxVoteCount: integer('maxVoteCount').notNull(),
  avgRating: real('avgRating').notNull(),
  updatedAt: integer('updatedAt')
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$type<number>(),
});

// ============================================================================
// User Keyword Preferences Table
// ============================================================================

export const userKeywordPreferences = sqliteTable(
  'user_keyword_preferences',
  {
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keywordId: integer('keywordId').notNull(),
    keywordName: text('keywordName').notNull(),
    score: integer('score').notNull().default(0),
    count: integer('count').notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.keywordId] }),
    index('idx_user_keyword_preferences_user').on(table.userId),
  ],
);

// ============================================================================
// User Settings Table
// ============================================================================

export const userSettings = sqliteTable(
  'user_settings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('userId')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    language: text('language').notNull().default('en-US'),
    regions: text('regionGroups', { mode: 'json' })
      .notNull()
      .default('["western"]')
      .$type<RegionGroupId[]>(),
    withGenres: text('withGenres', { mode: 'json' }).notNull().default('[]').$type<string[]>(),
    createdAt: integer('createdAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
    updatedAt: integer('updatedAt')
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$type<number>(),
  },
  (table) => [index('idx_user_settings_user').on(table.userId)],
);

// ============================================================================
// Relations
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
  interactions: many(userMediaInteractions),
  genrePreferences: many(userGenrePreferences),
  keywordPreferences: many(userKeywordPreferences),
  userSettings: one(userSettings),
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

export const userGenrePreferencesRelations = relations(userGenrePreferences, ({ one }) => ({
  user: one(users, {
    fields: [userGenrePreferences.userId],
    references: [users.id],
  }),
}));

export const userKeywordPreferencesRelations = relations(userKeywordPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userKeywordPreferences.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// Schema Export
// ============================================================================

export const schema = {
  appSettings,
  users,
  media,
  userMediaInteractions,
  userGenrePreferences,
  catalogCache,
  mediaStats,
  userKeywordPreferences,
  userSettings,
};

export const relationsSchema = {
  usersRelations,
  mediaRelations,
  userMediaInteractionsRelations,
  userGenrePreferencesRelations,
  userKeywordPreferencesRelations,
  userSettingsRelations,
};

// ============================================================================
// Database Types - Inferred from Drizzle Schema
// ============================================================================

export type DbUser = InferSelectModel<typeof users>;
export type DbMedia = InferSelectModel<typeof media>;
export type DbUserMediaInteraction = InferSelectModel<typeof userMediaInteractions>;
export type DbUserGenrePreference = InferSelectModel<typeof userGenrePreferences>;
export type DbUserKeywordPreference = InferSelectModel<typeof userKeywordPreferences>;
export type DbCatalogCache = InferSelectModel<typeof catalogCache>;
