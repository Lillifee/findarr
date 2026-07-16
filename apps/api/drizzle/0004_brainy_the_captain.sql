PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`tmdbId` integer,
	`tvdbId` integer,
	`arrId` integer,
	`arrUrl` text,
	`libId` text,
	`libUrl` text,
	`libAddedAt` integer,
	`status` text DEFAULT 'none' NOT NULL,
	`seasons` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "type", "tmdbId", "tvdbId", "arrId", "arrUrl", "libId", "libUrl", "libAddedAt", "status", "seasons", "createdAt", "updatedAt") SELECT "id", "type", "tmdbId", "tvdbId", "arrId", "arrUrl", "libId", "libUrl", "libAddedAt", "status", "seasons", "createdAt", "updatedAt" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_media_tvdb` ON `media` (`tvdbId`);--> statement-breakpoint
CREATE INDEX `idx_media_tmdb` ON `media` (`tmdbId`,`type`);--> statement-breakpoint
CREATE INDEX `idx_media_arr` ON `media` (`arrId`);--> statement-breakpoint
CREATE INDEX `idx_media_status` ON `media` (`status`);--> statement-breakpoint
CREATE INDEX `idx_media_lib` ON `media` (`libId`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_tmdbId_type_unique` ON `media` (`tmdbId`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_tvdbId_type_unique` ON `media` (`tvdbId`,`type`);