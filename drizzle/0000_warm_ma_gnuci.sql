CREATE TYPE "public"."comic_status" AS ENUM('ongoing', 'completed', 'hiatus', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."comic_type" AS ENUM('manga', 'webtoon', 'western');--> statement-breakpoint
CREATE TABLE "chapter_images" (
	"image_id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"image_ordering" integer NOT NULL,
	"image_path" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comic_chapters" (
	"chapter_id" serial PRIMARY KEY NOT NULL,
	"comic_id" integer NOT NULL,
	"chapter_number" numeric(10, 2) NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comics" (
	"comic_id" serial PRIMARY KEY NOT NULL,
	"comic_title" varchar(200) NOT NULL,
	"thumbnail_address" varchar(500) NOT NULL,
	"comic_description" varchar(2000),
	"number_of_chapters" integer DEFAULT 0 NOT NULL,
	"comic_type" "comic_type" NOT NULL,
	"tags" varchar(50)[] DEFAULT '{}' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "comic_status" DEFAULT 'ongoing' NOT NULL,
	CONSTRAINT "comics_comic_title_unique" UNIQUE("comic_title")
);
--> statement-breakpoint
CREATE TABLE "ebook_bookmarks" (
	"bookmark_id" serial PRIMARY KEY NOT NULL,
	"ebook_id" integer NOT NULL,
	"bookmark_name" varchar(200) NOT NULL,
	"chapter_title" varchar(200),
	"position_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ebooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ebook_title" text NOT NULL,
	"ebook_author" text NOT NULL,
	"ebook_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"movie_id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sprite_address" text NOT NULL,
	"thumbnail_address" text NOT NULL,
	"video_address" text NOT NULL,
	"tags" varchar(50)[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_types" (
	"tag_name" varchar(50) PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tv_episodes" (
	"episode_id" serial PRIMARY KEY NOT NULL,
	"tv_show_id" integer NOT NULL,
	"season_number" integer NOT NULL,
	"episode_number" integer NOT NULL,
	"episode_title" text NOT NULL,
	"sprite_address" text NOT NULL,
	"video_address" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tv_shows" (
	"tv_show_id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"thumbnail_address" text NOT NULL,
	"description" text,
	"tags" varchar(50)[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_images" ADD CONSTRAINT "chapter_images_chapter_id_comic_chapters_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."comic_chapters"("chapter_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comic_chapters" ADD CONSTRAINT "comic_chapters_comic_id_comics_comic_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("comic_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ebook_bookmarks" ADD CONSTRAINT "ebook_bookmarks_ebook_id_ebooks_id_fk" FOREIGN KEY ("ebook_id") REFERENCES "public"."ebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tv_episodes" ADD CONSTRAINT "tv_episodes_tv_show_id_tv_shows_tv_show_id_fk" FOREIGN KEY ("tv_show_id") REFERENCES "public"."tv_shows"("tv_show_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chapter_images_chapter_id" ON "chapter_images" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_chapter_images_ordering" ON "chapter_images" USING btree ("chapter_id","image_ordering");--> statement-breakpoint
CREATE INDEX "idx_comic_chapters_comic_id" ON "comic_chapters" USING btree ("comic_id");--> statement-breakpoint
CREATE INDEX "idx_comic_chapters_chapter_number" ON "comic_chapters" USING btree ("chapter_number");--> statement-breakpoint
CREATE INDEX "idx_comics_updated_at" ON "comics" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_comics_tags_gin" ON "comics" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_ebook_bookmarks_ebook_id" ON "ebook_bookmarks" USING btree ("ebook_id");--> statement-breakpoint
CREATE INDEX "idx_ebook_bookmarks_created_at" ON "ebook_bookmarks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ebooks_title_author" ON "ebooks" USING btree ("ebook_title","ebook_author");--> statement-breakpoint
CREATE INDEX "idx_movies_updated_at" ON "movies" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_movies_tags_gin" ON "movies" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_tv_episodes_tv_show_id" ON "tv_episodes" USING btree ("tv_show_id");--> statement-breakpoint
CREATE INDEX "idx_tv_episodes_season_episode" ON "tv_episodes" USING btree ("tv_show_id","season_number","episode_number");--> statement-breakpoint
CREATE INDEX "idx_tv_episodes_updated_at" ON "tv_episodes" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_tv_shows_updated_at" ON "tv_shows" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_tv_shows_tags_gin" ON "tv_shows" USING gin ("tags");