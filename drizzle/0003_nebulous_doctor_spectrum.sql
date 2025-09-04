ALTER TABLE `followers` ADD `follower` integer NOT NULL;--> statement-breakpoint
CREATE INDEX `follower_idx` ON `followers` (`follower`);--> statement-breakpoint
CREATE INDEX `followerId_idx` ON `followers` (`followerId`);--> statement-breakpoint
ALTER TABLE `following` ADD `following` integer NOT NULL;--> statement-breakpoint
CREATE INDEX `following_idx` ON `following` (`following`);--> statement-breakpoint
CREATE INDEX `followingId_idx` ON `following` (`followingId`);--> statement-breakpoint
CREATE INDEX `password_idx` ON `users` (`password`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_idx` ON `users` (`email`);