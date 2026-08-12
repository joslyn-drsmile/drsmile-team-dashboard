CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`email` text,
	`active` integer DEFAULT true NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE TABLE `menu_permissions` (
	`member_id` text NOT NULL,
	`menu` text NOT NULL,
	`can_view` integer DEFAULT true NOT NULL,
	`can_add` integer DEFAULT false NOT NULL,
	`can_edit` integer DEFAULT false NOT NULL,
	`can_delete` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`member_id`, `menu`)
);
