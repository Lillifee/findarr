ALTER TABLE `media` RENAME COLUMN `jellyfinId` TO `libId`;--> statement-breakpoint
ALTER TABLE `media` RENAME COLUMN `jellyfinAddedAt` TO `libAddedAt`;--> statement-breakpoint
ALTER TABLE `media` ADD `libUrl` text;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_media_jellyfin`;--> statement-breakpoint
CREATE INDEX `idx_media_lib` ON `media` (`libId`);
