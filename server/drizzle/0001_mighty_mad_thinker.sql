CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
