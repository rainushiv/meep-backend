PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_meepsImgs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`imageText` text NOT NULL,
	`imageUrl` text,
	`body` text(400) NOT NULL,
	`creatorId` integer NOT NULL,
	`creationTime` integer DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`creatorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_meepsImgs`("id", "imageText", "imageUrl", "body", "creatorId", "creationTime") SELECT "id", "imageText", "imageUrl", "body", "creatorId", "creationTime" FROM `meepsImgs`;--> statement-breakpoint
DROP TABLE `meepsImgs`;--> statement-breakpoint
ALTER TABLE `__new_meepsImgs` RENAME TO `meepsImgs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;