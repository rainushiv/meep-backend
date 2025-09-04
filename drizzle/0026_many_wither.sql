CREATE TABLE `commentLikes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment` integer NOT NULL,
	`userId` integer NOT NULL,
	FOREIGN KEY (`comment`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
