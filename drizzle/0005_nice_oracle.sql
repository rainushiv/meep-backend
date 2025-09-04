CREATE TABLE `meepsImgs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`image` blob NOT NULL,
	`body` text(400) NOT NULL,
	`creatorId` integer NOT NULL,
	`creationTime` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
