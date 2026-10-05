-- Standalone FTS5 index for searching inside translations and definitions (Q6).
-- Not external-content: words has a text primary key, so its rowid is not stable.
-- word_id is indexed too, so one word's row can be found without a full scan.
CREATE VIRTUAL TABLE `words_fts` USING fts5(
	word_id,
	translation,
	definition,
	tokenize = 'trigram remove_diacritics 1'
);
--> statement-breakpoint
INSERT INTO `words_fts` (word_id, translation, definition)
SELECT id, translation, definition FROM `words`
WHERE translation IS NOT NULL OR definition IS NOT NULL;
