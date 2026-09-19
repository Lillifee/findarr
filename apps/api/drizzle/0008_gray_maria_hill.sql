PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`userId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`kind` text NOT NULL,
	`subjectKey` text NOT NULL,
	`subjectName` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`userId`, `mediaType`, `kind`, `subjectKey`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`("userId", "mediaType", "kind", "subjectKey", "subjectName", "score", "count") SELECT "userId", 'movie', "kind", "subjectKey", "subjectName", "score", "count" FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_user_preferences_user_kind` ON `user_preferences` (`userId`,`kind`);