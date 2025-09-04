ALTER TABLE `users` ADD `otpSecret` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_otpSecret_unique` ON `users` (`otpSecret`);