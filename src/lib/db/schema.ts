import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Tag Types Table
export const tagTypes = sqliteTable("tag_types", {
  tagName: text("tag_name").primaryKey(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
});

// Genre Types Table
export const genreTypes = sqliteTable("genre_types", {
  genreName: text("genre_name").primaryKey(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
});

// Comics Table
// Note: ENUM types converted to TEXT with CHECK constraint in SQL, but Drizzle handles as text
export const comics = sqliteTable(
  "comics",
  {
    comicId: integer("comic_id").primaryKey({ autoIncrement: true }),
    comicTitle: text("comic_title").notNull().unique(),
    thumbnailAddress: text("thumbnail_address").notNull(),
    comicDescription: text("comic_description"),
    numberOfChapters: integer("number_of_chapters").default(0).notNull(),
    comicType: text("comic_type")
      .notNull()
      .$type<"manga" | "webtoon" | "western">(),
    tags: text("tags").default("[]").notNull(), // JSON array stored as TEXT
    views: integer("views").default(0).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    status: text("status")
      .notNull()
      .default("ongoing")
      .$type<"ongoing" | "completed" | "hiatus" | "cancelled">(),
  },
  (table) => ({
    updatedAtIdx: index("idx_comics_updated_at").on(table.updatedAt),
  })
);

// Comic Chapters Table
export const comicChapters = sqliteTable(
  "comic_chapters",
  {
    chapterId: integer("chapter_id").primaryKey({ autoIncrement: true }),
    comicId: integer("comic_id")
      .notNull()
      .references(() => comics.comicId, { onDelete: "cascade" }),
    chapterNumber: real("chapter_number").notNull(),
    favorite: integer("favorite", { mode: "boolean" }).default(false).notNull(),
  },
  (table) => ({
    comicIdIdx: index("idx_comic_chapters_comic_id").on(table.comicId),
    chapterNumberIdx: index("idx_comic_chapters_chapter_number").on(
      table.chapterNumber
    ),
  })
);

// Chapter Images Table
export const chapterImages = sqliteTable(
  "chapter_images",
  {
    imageId: integer("image_id").primaryKey({ autoIncrement: true }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => comicChapters.chapterId, { onDelete: "cascade" }),
    imageOrdering: integer("image_ordering").notNull(),
    imagePath: text("image_path").notNull(),
  },
  (table) => ({
    chapterIdIdx: index("idx_chapter_images_chapter_id").on(table.chapterId),
    orderingIdx: index("idx_chapter_images_ordering").on(
      table.chapterId,
      table.imageOrdering
    ),
  })
);

// Movies Table
export const movies = sqliteTable(
  "movies",
  {
    movieId: integer("movie_id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    spriteAddress: text("sprite_address").notNull(),
    thumbnailAddress: text("thumbnail_address").notNull(),
    masterPlaylistAddress: text("master_playlist_address").notNull(),
    tags: text("tags").default("[]").notNull(), // JSON array stored as TEXT
    genres: text("genres").default("[]").notNull(), // JSON array stored as TEXT
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    views: integer("views").default(0).notNull(),
  },
  (table) => ({
    updatedAtIdx: index("idx_movies_updated_at").on(table.updatedAt),
  })
);

// TV Shows Table
export const tvShows = sqliteTable(
  "tv_shows",
  {
    tvShowId: integer("tv_show_id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    thumbnailAddress: text("thumbnail_address").notNull(),
    description: text("description"),
    tags: text("tags").default("[]").notNull(), // JSON array stored as TEXT
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    views: integer("views").default(0).notNull(),
  },
  (table) => ({
    updatedAtIdx: index("idx_tv_shows_updated_at").on(table.updatedAt),
  })
);

// TV Episodes Table
export const tvEpisodes = sqliteTable(
  "tv_episodes",
  {
    episodeId: integer("episode_id").primaryKey({ autoIncrement: true }),
    tvShowId: integer("tv_show_id")
      .notNull()
      .references(() => tvShows.tvShowId, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    episodeTitle: text("episode_title").notNull(),
    spriteAddress: text("sprite_address").notNull(),
    masterPlaylistAddress: text("master_playlist_address").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    views: integer("views").default(0).notNull(),
  },
  (table) => ({
    tvShowIdIdx: index("idx_tv_episodes_tv_show_id").on(table.tvShowId),
    seasonEpisodeIdx: index("idx_tv_episodes_season_episode").on(
      table.tvShowId,
      table.seasonNumber,
      table.episodeNumber
    ),
    updatedAtIdx: index("idx_tv_episodes_updated_at").on(table.updatedAt),
  })
);

// Ebooks Table
export const ebooks = sqliteTable(
  "ebooks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ebookTitle: text("ebook_title").notNull(),
    ebookAuthor: text("ebook_author").notNull(),
    ebookAddress: text("ebook_address").notNull(),
  },
  (table) => ({
    uniqueTitleAuthor: index("idx_ebooks_title_author").on(
      table.ebookTitle,
      table.ebookAuthor
    ),
  })
);

// Ebook Bookmarks Table
export const ebookBookmarks = sqliteTable(
  "ebook_bookmarks",
  {
    bookmarkId: integer("bookmark_id").primaryKey({ autoIncrement: true }),
    ebookId: integer("ebook_id")
      .notNull()
      .references(() => ebooks.id, { onDelete: "cascade" }),
    bookmarkName: text("bookmark_name").notNull(),
    chapterTitle: text("chapter_title"),
    cfi: text("cfi"), // CFI string - the recommended way to store EPUB locations
    positionPercentage: real("position_percentage"), // Optional: kept for backward compatibility and display
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    ebookIdIdx: index("idx_ebook_bookmarks_ebook_id").on(table.ebookId),
    createdAtIdx: index("idx_ebook_bookmarks_created_at").on(table.createdAt),
  })
);

// Video Versions Table for HLS support
export const videoVersions = sqliteTable(
  "video_versions",
  {
    versionId: integer("version_id").primaryKey({ autoIncrement: true }),
    movieId: integer("movie_id").references(() => movies.movieId, {
      onDelete: "cascade",
    }),
    tvEpisodeId: integer("tv_episode_id").references(
      () => tvEpisodes.episodeId,
      {
        onDelete: "cascade",
      }
    ),
    versionNumber: text("version_number").notNull(), // v0, v1, v2, etc.
    resolution: integer("resolution"), // 1080, 720, 480, etc.
    basePath: text("base_path").notNull(),
    playlistPath: text("playlist_path").notNull(),
    bandwidth: integer("bandwidth"),
    width: integer("width"),
    height: integer("height"),
    isDefault: integer("is_default", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    movieIdIdx: index("idx_video_versions_movie_id").on(table.movieId),
    tvEpisodeIdIdx: index("idx_video_versions_tv_episode_id").on(
      table.tvEpisodeId
    ),
    isDefaultIdx: index("idx_video_versions_is_default").on(table.isDefault),
    resolutionIdx: index("idx_video_versions_resolution").on(table.resolution),
  })
);

// Relations
export const comicsRelations = relations(comics, ({ many }) => ({
  chapters: many(comicChapters),
}));

export const comicChaptersRelations = relations(
  comicChapters,
  ({ one, many }) => ({
    comic: one(comics, {
      fields: [comicChapters.comicId],
      references: [comics.comicId],
    }),
    images: many(chapterImages),
  })
);

export const chapterImagesRelations = relations(chapterImages, ({ one }) => ({
  chapter: one(comicChapters, {
    fields: [chapterImages.chapterId],
    references: [comicChapters.chapterId],
  }),
}));

export const tvShowsRelations = relations(tvShows, ({ many }) => ({
  episodes: many(tvEpisodes),
}));

export const tvEpisodesRelations = relations(tvEpisodes, ({ one, many }) => ({
  tvShow: one(tvShows, {
    fields: [tvEpisodes.tvShowId],
    references: [tvShows.tvShowId],
  }),
  videoVersions: many(videoVersions),
}));

export const ebooksRelations = relations(ebooks, ({ many }) => ({
  bookmarks: many(ebookBookmarks),
}));

export const ebookBookmarksRelations = relations(ebookBookmarks, ({ one }) => ({
  ebook: one(ebooks, {
    fields: [ebookBookmarks.ebookId],
    references: [ebooks.id],
  }),
}));

export const videoVersionsRelations = relations(videoVersions, ({ one }) => ({
  movie: one(movies, {
    fields: [videoVersions.movieId],
    references: [movies.movieId],
  }),
  tvEpisode: one(tvEpisodes, {
    fields: [videoVersions.tvEpisodeId],
    references: [tvEpisodes.episodeId],
  }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  videoVersions: many(videoVersions),
}));

// Type exports
export type Comic = typeof comics.$inferSelect;
export type NewComic = typeof comics.$inferInsert;
export type ComicChapter = typeof comicChapters.$inferSelect;
export type NewComicChapter = typeof comicChapters.$inferInsert;
export type ChapterImage = typeof chapterImages.$inferSelect;
export type NewChapterImage = typeof chapterImages.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type TvShow = typeof tvShows.$inferSelect;
export type NewTvShow = typeof tvShows.$inferInsert;
export type TvEpisode = typeof tvEpisodes.$inferSelect;
export type NewTvEpisode = typeof tvEpisodes.$inferInsert;
export type Ebook = typeof ebooks.$inferSelect;
export type NewEbook = typeof ebooks.$inferInsert;
export type EbookBookmark = typeof ebookBookmarks.$inferSelect;
export type NewEbookBookmark = typeof ebookBookmarks.$inferInsert;
export type VideoVersion = typeof videoVersions.$inferSelect;
export type NewVideoVersion = typeof videoVersions.$inferInsert;
export type TagType = typeof tagTypes.$inferSelect;
export type NewTagType = typeof tagTypes.$inferInsert;
export type GenreType = typeof genreTypes.$inferSelect;
export type NewGenreType = typeof genreTypes.$inferInsert;
