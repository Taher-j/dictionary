CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`word_id` text NOT NULL,
	`direction` text NOT NULL,
	`state` integer DEFAULT 0 NOT NULL,
	`due` integer NOT NULL,
	`stability` real DEFAULT 0 NOT NULL,
	`difficulty` real DEFAULT 0 NOT NULL,
	`scheduled_days` integer DEFAULT 0 NOT NULL,
	`learning_steps` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`last_review` integer,
	`suspended` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cards_direction_check" CHECK("cards"."direction" IN ('recognition', 'recall'))
);
--> statement-breakpoint
CREATE INDEX `cards_due` ON `cards` (`due`) WHERE "cards"."suspended" = 0;--> statement-breakpoint
CREATE UNIQUE INDEX `cards_word_direction` ON `cards` (`word_id`,`direction`);--> statement-breakpoint
CREATE TABLE `dictionaries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`term_lang` text,
	`meaning_lang` text,
	`both_directions` integer DEFAULT false NOT NULL,
	`in_daily_review` integer DEFAULT true NOT NULL,
	`lookup_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`dictionary_id` text NOT NULL,
	`file_name` text,
	`rows_total` integer NOT NULL,
	`rows_imported` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`dictionary_id`) REFERENCES `dictionaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`session_id` text,
	`reviewed_at` integer NOT NULL,
	`rating` integer NOT NULL,
	`mode` text NOT NULL,
	`scheduled` integer NOT NULL,
	`duration_ms` integer,
	`prev_card` text,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_logs_card` ON `review_logs` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `review_logs_time` ON `review_logs` (`reviewed_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`filter` text,
	`started_at` integer NOT NULL,
	`ended_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_norm` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_norm_unique` ON `tags` (`name_norm`);--> statement-breakpoint
CREATE TABLE `word_tags` (
	`word_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`word_id`, `tag_id`),
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `word_tags_tag` ON `word_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`dictionary_id` text NOT NULL,
	`term` text NOT NULL,
	`term_norm` text NOT NULL,
	`term_fold` text NOT NULL,
	`translation` text,
	`definition` text,
	`example` text,
	`part_of_speech` text,
	`forms` text,
	`pronunciation` text,
	`notes` text,
	`source` text,
	`starred` integer DEFAULT false NOT NULL,
	`import_batch_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`dictionary_id`) REFERENCES `dictionaries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`import_batch_id`) REFERENCES `import_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `words_dict_norm` ON `words` (`dictionary_id`,`term_norm`);--> statement-breakpoint
CREATE INDEX `words_dict_fold` ON `words` (`dictionary_id`,`term_fold`,`id`);--> statement-breakpoint
CREATE INDEX `words_dict_created` ON `words` (`dictionary_id`,"created_at" DESC);