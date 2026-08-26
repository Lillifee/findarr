CREATE TABLE `user_preferences` (
	`userId` integer NOT NULL,
	`kind` text NOT NULL,
	`subjectKey` text NOT NULL,
	`subjectName` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`userId`, `kind`, `subjectKey`),
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_preferences_user_kind` ON `user_preferences` (`userId`,`kind`);
--> statement-breakpoint
INSERT INTO `user_preferences` (`userId`, `kind`, `subjectKey`, `subjectName`, `score`, `count`)
SELECT `userId`, 'genre', CAST(`genreId` AS text), `genreName`, `score`, `count`
FROM `user_genre_preferences`;
--> statement-breakpoint
INSERT INTO `user_preferences` (`userId`, `kind`, `subjectKey`, `subjectName`, `score`, `count`)
SELECT `userId`, 'keyword', CAST(`keywordId` AS text), `keywordName`, `score`, `count`
FROM `user_keyword_preferences`;