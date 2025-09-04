CREATE TABLE `followers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`followerId` integer,
	FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `following` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`followingId` integer,
	FOREIGN KEY (`followingId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(20) NOT NULL,
	`breed` text,
	`age` integer
);
--> statement-breakpoint
INSERT INTO `__new_pets`("id", "name", "breed", "age") SELECT "id", "name", "breed", "age" FROM `pets`;--> statement-breakpoint
DROP TABLE `pets`;--> statement-breakpoint
ALTER TABLE `__new_pets` RENAME TO `pets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;