CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdbId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`jellyfinId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_media_tmdb` ON `media` (`tmdbId`,`mediaType`);--> statement-breakpoint
CREATE INDEX `idx_media_status` ON `media` (`status`);--> statement-breakpoint
CREATE INDEX `idx_media_jellyfin` ON `media` (`jellyfinId`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_tmdbId_mediaType_unique` ON `media` (`tmdbId`,`mediaType`);--> statement-breakpoint
CREATE TABLE `user_media_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mediaId` integer NOT NULL,
	`userId` integer NOT NULL,
	`action` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`mediaId`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_media_interactions_user` ON `user_media_interactions` (`userId`,`action`);--> statement-breakpoint
CREATE INDEX `idx_user_media_interactions_media` ON `user_media_interactions` (`mediaId`,`action`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_media_interactions_mediaId_userId_action_unique` ON `user_media_interactions` (`mediaId`,`userId`,`action`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL,
	`displayName` text NOT NULL,
	`role` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);