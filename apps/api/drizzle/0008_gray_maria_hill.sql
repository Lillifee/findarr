PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_preferences` (
	`userId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`kind` text NOT NULL,
	`subjectKey` text NOT NULL,
	`subjectName` text NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`dislikes` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`userId`, `mediaType`, `kind`, `subjectKey`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_preferences`("userId", "mediaType", "kind", "subjectKey", "subjectName", "likes", "dislikes") SELECT "userId", 'movie', "kind", "subjectKey", "subjectName", ("count" + "score") / 2, ("count" - "score") / 2 FROM `user_preferences`;--> statement-breakpoint
DROP TABLE `user_preferences`;--> statement-breakpoint
ALTER TABLE `__new_user_preferences` RENAME TO `user_preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_user_preferences_user_kind` ON `user_preferences` (`userId`,`kind`);