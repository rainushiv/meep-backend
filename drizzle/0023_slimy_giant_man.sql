CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`imageText` text NOT NULL,
	`imageUrl` text,
	`body` text(400) NOT NULL,
	`creatorId` integer NOT NULL,
	`meepId` integer NOT NULL,
	FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`meepId`) REFERENCES `meepsImgs`(`id`) ON UPDATE no action ON DELETE no action
);
