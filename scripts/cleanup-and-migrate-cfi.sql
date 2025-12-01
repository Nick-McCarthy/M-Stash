-- Cleanup and Migration: Add CFI column to ebook_bookmarks table

BEGIN TRANSACTION;

-- Step 0: Clean up any leftover temporary table from failed migration
DROP TABLE IF EXISTS `__new_ebook_bookmarks`;

-- Step 1: Create new table with updated schema
CREATE TABLE `__new_ebook_bookmarks` (
    `bookmark_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `ebook_id` integer NOT NULL,
    `bookmark_name` text NOT NULL,
    `chapter_title` text,
    `cfi` text,
    `position_percentage` real,
    `created_at` integer NOT NULL,
    `updated_at` integer NOT NULL,
    FOREIGN KEY (`ebook_id`) REFERENCES `ebooks`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Step 2: Copy existing data (cfi will be NULL for existing records)
INSERT INTO `__new_ebook_bookmarks`(
    `bookmark_id`, 
    `ebook_id`, 
    `bookmark_name`, 
    `chapter_title`, 
    `cfi`, 
    `position_percentage`, 
    `created_at`, 
    `updated_at`
) 
SELECT 
    `bookmark_id`, 
    `ebook_id`, 
    `bookmark_name`, 
    `chapter_title`, 
    NULL,  -- cfi column doesn't exist in old table, set to NULL
    `position_percentage`, 
    `created_at`, 
    `updated_at` 
FROM `ebook_bookmarks`;

-- Step 3: Drop old table
DROP TABLE `ebook_bookmarks`;

-- Step 4: Rename new table
ALTER TABLE `__new_ebook_bookmarks` RENAME TO `ebook_bookmarks`;

-- Step 5: Recreate indexes
CREATE INDEX `idx_ebook_bookmarks_ebook_id` ON `ebook_bookmarks` (`ebook_id`);
CREATE INDEX `idx_ebook_bookmarks_created_at` ON `ebook_bookmarks` (`created_at`);

COMMIT;

